import os
from pathlib import Path
import re
import subprocess
import tempfile
import tomllib
import unittest


SCRIPT = Path(__file__).with_name('setup-codex.ps1')


class SetupTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='setup-codex-test-')
        self.addCleanup(self.temp.cleanup)
        self.home = Path(self.temp.name) / 'profile'
        self.home.mkdir()
        self.agents = self.home / 'AGENTS.md'
        self.agents_bytes = b'# Personal rules\r\nPreserve these.\r\n'
        self.agents.write_bytes(self.agents_bytes)
        self.policy = self.home / 'instructions' / 'codex-operating-policy.md'
        self.config = self.home / 'config.toml'
        self.config_bytes = b'model = "keep-me"\r\nmodel_instructions_file = "old.md"\r\nmodel_verbosity = "medium"\r\n[features]\r\napps = true\r\n'
        self.config.write_bytes(self.config_bytes)

    def run_setup(self, *args, succeeds=True):
        result = subprocess.run([
            'pwsh', '-NoProfile', '-File', str(SCRIPT), '-CodexHome', str(self.home),
            '-CommunicationLanguage', 'French', '-WritingLanguage', 'English',
            '-CodeLanguage', 'English', *args,
        ], capture_output=True, text=True, encoding='utf-8')
        if succeeds:
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        else:
            self.assertNotEqual(result.returncode, 0)
        return result

    def approval(self, *preview_args):
        output = self.run_setup(*preview_args, '-WhatIf').stdout
        def hash_for(label):
            return re.search(rf'{label} SHA256: (MISSING|[A-Fa-f0-9]+)', output).group(1)
        return ['-ApproveInstall', '-ApprovedContentHash', hash_for('Content'),
                '-ApprovedConfigHash', hash_for('Proposed config'),
                '-ExpectedPolicyHash', hash_for('Policy'), '-ExpectedConfigHash', hash_for('Config')]

    def test_preview_is_read_only(self):
        before = {str(p.relative_to(self.home)): p.read_bytes() for p in self.home.rglob('*') if p.is_file()}
        output = self.run_setup('-WhatIf').stdout
        self.assertIn('model_instructions_file = ', output)
        self.assertIn('# Codex Operating Policy', output)
        after = {str(p.relative_to(self.home)): p.read_bytes() for p in self.home.rglob('*') if p.is_file()}
        self.assertEqual(before, after)

    def test_install_preserves_agents_and_other_config_with_backups(self):
        self.run_setup(*self.approval())
        self.assertEqual(self.agents.read_bytes(), self.agents_bytes)
        policy = self.policy.read_text(encoding='utf-8')
        self.assertTrue(policy.startswith('# Codex Operating Policy\n'))
        self.assertIn('Use French for conversation', policy)
        self.assertNotIn('{{', policy)
        config = tomllib.loads(self.config.read_text(encoding='utf-8'))
        self.assertEqual(config['model'], 'keep-me')
        self.assertEqual(config['model_verbosity'], 'medium')
        self.assertEqual(config['features']['apps'], True)
        self.assertEqual(Path(config['model_instructions_file']), self.policy)
        backups = list((self.home / 'backups').glob('setup-codex-*'))
        self.assertEqual(len(backups), 1)
        self.assertEqual((backups[0] / 'config.toml').read_bytes(), self.config_bytes)
        self.assertFalse((backups[0] / 'AGENTS.md').exists())

    def test_low_verbosity_requires_separate_approval(self):
        output = self.run_setup('-SetLowVerbosity', '-WhatIf').stdout
        self.assertIn('Proposed verbosity setting: model_verbosity = "low"', output)
        approval = self.approval('-SetLowVerbosity')
        self.run_setup(*approval, '-SetLowVerbosity', succeeds=False)
        self.assertFalse(self.policy.exists())
        self.assertEqual(self.config.read_bytes(), self.config_bytes)
        self.assertFalse((self.home / 'backups').exists())
        self.run_setup(*self.approval(), '-SetLowVerbosity', '-ApproveLowVerbosity', succeeds=False)
        self.assertEqual(self.config.read_bytes(), self.config_bytes)
        self.run_setup(*approval, '-SetLowVerbosity', '-ApproveLowVerbosity')
        config = tomllib.loads(self.config.read_text())
        self.assertEqual(config['model_verbosity'], 'low')
        self.assertEqual(config['model'], 'keep-me')
        self.assertEqual(self.agents.read_bytes(), self.agents_bytes)

    def test_default_installs_only_embedded_policy(self):
        skill = SCRIPT.parent.parent / 'SKILL.md'
        match = re.search(r'^```markdown\n(# Codex Operating Policy\n.*?)^```$', skill.read_text(encoding='utf-8'), re.M | re.S)
        self.assertIsNotNone(match)
        expected = match.group(1).replace('{{COMMUNICATION_LANGUAGE}}', 'French').replace('{{WRITING_LANGUAGE}}', 'English').replace('{{CODE_LANGUAGE}}', 'English')
        self.run_setup(*self.approval())
        self.assertEqual(self.policy.read_text(encoding='utf-8'), expected)
        self.assertIn('open a non-draft PR by default', expected)
        self.assertIn('use a draft only when the user or project requests one', expected)

    def test_existing_policy_and_bom_config_are_backed_up(self):
        self.policy.parent.mkdir()
        previous_policy = b'# Previous policy\r\nKeep for restoration.\r\n'
        self.policy.write_bytes(previous_policy)
        self.config_bytes = b'\xef\xbb\xbf' + self.config_bytes
        self.config.write_bytes(self.config_bytes)
        self.run_setup(*self.approval())
        backups = list((self.home / 'backups').glob('setup-codex-*'))
        self.assertEqual(len(backups), 1)
        self.assertEqual((backups[0] / 'codex-operating-policy.md').read_bytes(), previous_policy)
        self.assertEqual((backups[0] / 'config.toml').read_bytes(), self.config_bytes)
        self.assertTrue(self.config.read_bytes().startswith(b'\xef\xbb\xbf'))

    def test_unapproved_write_is_rejected(self):
        self.run_setup(succeeds=False)
        self.assertFalse(self.policy.exists())
        self.assertEqual(self.config.read_bytes(), self.config_bytes)

    def test_stale_config_or_policy_is_rejected(self):
        approval = self.approval()
        self.config.write_text('model = "concurrent"\n')
        self.run_setup(*approval, succeeds=False)
        self.assertFalse(self.policy.exists())
        self.assertFalse((self.home / 'backups').exists())
        approval = self.approval()
        self.policy.parent.mkdir()
        self.policy.write_text('Concurrent policy')
        self.run_setup(*approval, succeeds=False)
        self.assertEqual(self.policy.read_text(), 'Concurrent policy')

    def test_unreviewed_content_is_rejected(self):
        approval = self.approval()
        approval[2] = '0' * 64
        self.run_setup(*approval, succeeds=False)
        self.assertFalse(self.policy.exists())

    def test_rerun_is_unchanged(self):
        self.run_setup(*self.approval())
        before = (self.policy.stat().st_mtime_ns, self.config.stat().st_mtime_ns)
        self.run_setup(*self.approval())
        self.assertEqual((self.policy.stat().st_mtime_ns, self.config.stat().st_mtime_ns), before)
        self.assertEqual(len(list((self.home / 'backups').glob('setup-codex-*'))), 1)

    def test_new_profile(self):
        self.home = Path(self.temp.name) / 'new-profile'
        self.policy = self.home / 'instructions' / 'codex-operating-policy.md'
        self.config = self.home / 'config.toml'
        approval = self.approval()
        self.assertFalse(self.home.exists())
        self.run_setup(*approval)
        self.assertTrue(self.policy.is_file())
        self.assertEqual(Path(tomllib.loads(self.config.read_text())['model_instructions_file']), self.policy)
        self.assertFalse((self.home / 'backups').exists())
        self.assertFalse((self.home / 'AGENTS.md').exists())

    def test_config_with_only_tables_gets_top_level_setting(self):
        self.config.write_text('[features]\napps = true\n')
        self.run_setup(*self.approval('-SetLowVerbosity'), '-SetLowVerbosity', '-ApproveLowVerbosity')
        config = tomllib.loads(self.config.read_text())
        self.assertEqual(Path(config['model_instructions_file']), self.policy)
        self.assertEqual(config['model_verbosity'], 'low')
        self.assertEqual(config['features']['apps'], True)

    @unittest.skipUnless(os.name == 'nt', 'Windows junction check')
    def test_linked_profile_is_rejected(self):
        link = Path(self.temp.name) / 'linked-profile'
        result = subprocess.run(['pwsh', '-NoProfile', '-Command',
                                 f"New-Item -ItemType Junction -Path '{link}' -Target '{self.home}' | Out-Null"],
                                capture_output=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.addCleanup(lambda: os.rmdir(link))
        self.home = link
        self.run_setup('-WhatIf', succeeds=False)
        self.assertEqual(self.agents.read_bytes(), self.agents_bytes)

    def test_missing_source_does_not_change_config(self):
        self.run_setup('-SourcePolicy', str(Path(self.temp.name) / 'absent.md'), '-WhatIf', succeeds=False)
        self.assertEqual(self.config.read_bytes(), self.config_bytes)

    def test_empty_language_is_rejected(self):
        result = subprocess.run(['pwsh', '-NoProfile', '-File', str(SCRIPT), '-CodexHome', str(self.home),
                                 '-CommunicationLanguage', ' ', '-WritingLanguage', 'English',
                                 '-CodeLanguage', 'English', '-WhatIf'], capture_output=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(self.config.read_bytes(), self.config_bytes)


if __name__ == '__main__':
    unittest.main()
