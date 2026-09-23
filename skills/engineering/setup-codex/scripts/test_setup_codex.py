import os
from pathlib import Path
import re
import subprocess
import tempfile
import unittest


SCRIPT = Path(__file__).with_name('setup-codex.ps1')


class SetupTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='setup-codex-test-')
        self.addCleanup(self.temp.cleanup)
        self.home = Path(self.temp.name) / 'profile'
        self.home.mkdir()
        self.target = self.home / 'AGENTS.md'
        self.original = b'# Personal rules\r\nKeep this in the backup.\r\n'
        self.target.write_bytes(self.original)
        self.config = self.home / 'config.toml'
        self.config.write_text('model = "keep-me"\nmodel_instructions_file = "old.md"\n')

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

    def approval(self):
        result = self.run_setup('-WhatIf')
        content = re.search(r'Content SHA256: ([A-Fa-f0-9]+)', result.stdout).group(1)
        target = re.search(r'Target SHA256: (MISSING|[A-Fa-f0-9]+)', result.stdout).group(1)
        return ['-ApproveReplacement', '-ApprovedContentHash', content, '-ExpectedTargetHash', target]

    def test_preview_is_read_only(self):
        before = {str(p.relative_to(self.home)): p.read_bytes() for p in self.home.rglob('*') if p.is_file()}
        self.approval()
        after = {str(p.relative_to(self.home)): p.read_bytes() for p in self.home.rglob('*') if p.is_file()}
        self.assertEqual(before, after)

    def test_full_replacement_and_backup_without_config_or_skill_changes(self):
        config = self.config.read_bytes()
        self.run_setup(*self.approval())
        text = self.target.read_text(encoding='utf-8')
        self.assertNotIn('Keep this in the backup', text)
        self.assertIn('Use French for conversation', text)
        self.assertNotIn('{{', text)
        self.assertEqual(self.config.read_bytes(), config)
        backups = list((self.home / 'backups').rglob('AGENTS.md'))
        self.assertEqual(len(backups), 1)
        self.assertEqual(backups[0].read_bytes(), self.original)
        self.assertFalse((self.home / 'instructions').exists())
        self.assertFalse((self.home / 'skills').exists())

    def test_default_installs_only_embedded_policy(self):
        skill = SCRIPT.parent.parent / 'SKILL.md'
        match = re.search(r'^```markdown\n(# User operating instructions\n.*?)^```$', skill.read_text(encoding='utf-8'), re.M | re.S)
        self.assertIsNotNone(match, 'Policy must be embedded in SKILL.md')
        expected = match.group(1).replace('{{COMMUNICATION_LANGUAGE}}', 'French').replace('{{WRITING_LANGUAGE}}', 'English').replace('{{CODE_LANGUAGE}}', 'English')
        self.run_setup(*self.approval())
        self.assertEqual(self.target.read_text(encoding='utf-8'), expected)

    def test_unapproved_write_is_rejected(self):
        self.run_setup(succeeds=False)
        self.assertEqual(self.target.read_bytes(), self.original)

    def test_stale_target_is_rejected(self):
        approval = self.approval()
        self.target.write_text('Concurrent edit')
        self.run_setup(*approval, succeeds=False)
        self.assertEqual(self.target.read_text(), 'Concurrent edit')
        self.assertFalse((self.home / 'backups').exists())

    def test_unreviewed_content_is_rejected(self):
        approval = self.approval()
        approval[2] = '0' * 64
        self.run_setup(*approval, succeeds=False)
        self.assertEqual(self.target.read_bytes(), self.original)

    def test_rerun_is_unchanged(self):
        approval = self.approval()
        self.run_setup(*approval)
        before = self.target.stat().st_mtime_ns
        self.run_setup(*self.approval())
        self.assertEqual(self.target.stat().st_mtime_ns, before)
        self.assertEqual(len(list((self.home / 'backups').rglob('AGENTS.md'))), 1)

    def test_override_blocks_application_but_not_preview(self):
        (self.home / 'AGENTS.override.md').write_text('Other instructions')
        approval = self.approval()
        self.run_setup(*approval, succeeds=False)
        self.assertEqual(self.target.read_bytes(), self.original)

    def test_new_profile(self):
        self.home = Path(self.temp.name) / 'new-profile'
        approval = self.approval()
        self.assertFalse(self.home.exists())
        self.run_setup(*approval)
        self.assertTrue((self.home / 'AGENTS.md').is_file())
        self.assertFalse((self.home / 'config.toml').exists())

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
        self.assertEqual(self.target.read_bytes(), self.original)

    def test_missing_source_does_not_change_target(self):
        self.run_setup('-SourcePolicy', str(Path(self.temp.name) / 'absent.md'), '-WhatIf', succeeds=False)
        self.assertEqual(self.target.read_bytes(), self.original)

    def test_empty_language_is_rejected(self):
        result = subprocess.run(['pwsh', '-NoProfile', '-File', str(SCRIPT), '-CodexHome', str(self.home),
                                 '-CommunicationLanguage', ' ', '-WritingLanguage', 'English',
                                 '-CodeLanguage', 'English', '-WhatIf'], capture_output=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(self.target.read_bytes(), self.original)


if __name__ == '__main__':
    unittest.main()
