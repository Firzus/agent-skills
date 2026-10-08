import os
from pathlib import Path
import re
import subprocess
import tempfile
import unittest


SCRIPT = Path(__file__).with_name('setup-cursor.ps1')


class SetupTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='setup-cursor-test-')
        self.addCleanup(self.temp.cleanup)
        self.home = Path(self.temp.name) / 'profile'
        self.rules = self.home / 'rules'
        self.rules.mkdir(parents=True)
        self.other_rule = self.rules / 'personal.mdc'
        self.other_bytes = b'---\r\nalwaysApply: true\r\n---\r\nPreserve these.\r\n'
        self.other_rule.write_bytes(self.other_bytes)
        self.policy = self.rules / 'cursor-operating-policy.mdc'

    def snapshot(self):
        return {str(p.relative_to(self.home)): p.read_bytes() for p in self.home.rglob('*') if p.is_file()}

    def run_setup(self, *args, succeeds=True):
        result = subprocess.run([
            'pwsh', '-NoProfile', '-File', str(SCRIPT), '-CursorHome', str(self.home),
            '-CommunicationLanguage', 'French', '-WritingLanguage', 'English',
            '-CodeLanguage', 'English', *args,
        ], capture_output=True, text=True, encoding='utf-8')
        if succeeds:
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        else:
            self.assertNotEqual(result.returncode, 0)
        return result

    def approval(self):
        output = self.run_setup('-WhatIf').stdout
        def hash_for(label):
            return re.search(rf'{label} SHA256: (MISSING|[A-Fa-f0-9]+)', output).group(1)
        return ['-ApproveInstall', '-ApprovedContentHash', hash_for('Content'),
                '-ExpectedPolicyHash', hash_for('Policy')]

    def test_preview_is_read_only_and_lists_other_rules(self):
        before = self.snapshot()
        output = self.run_setup('-WhatIf').stdout
        self.assertIn('# Cursor Operating Policy', output)
        self.assertIn('Other rule files: personal.mdc', output)
        self.assertEqual(before, self.snapshot())

    def test_install_writes_always_applied_rule_and_preserves_other_rules(self):
        self.run_setup(*self.approval())
        policy = self.policy.read_text(encoding='utf-8')
        self.assertTrue(policy.startswith('---\ndescription: '))
        self.assertIn('\nalwaysApply: true\n---\n\n# Cursor Operating Policy\n', policy)
        self.assertIn('Use French for conversation', policy)
        self.assertNotIn('{{', policy)
        self.assertEqual(self.other_rule.read_bytes(), self.other_bytes)
        self.assertFalse((self.home / 'backups').exists())

    def test_default_installs_only_embedded_policy(self):
        skill = SCRIPT.parent.parent / 'SKILL.md'
        match = re.search(r'^```markdown\n(# Cursor Operating Policy\n.*?)^```$', skill.read_text(encoding='utf-8'), re.M | re.S)
        self.assertIsNotNone(match)
        expected = match.group(1).replace('{{COMMUNICATION_LANGUAGE}}', 'French').replace('{{WRITING_LANGUAGE}}', 'English').replace('{{CODE_LANGUAGE}}', 'English')
        self.run_setup(*self.approval())
        self.assertTrue(self.policy.read_text(encoding='utf-8').endswith('\n\n' + expected))
        self.assertIn('open a non-draft PR by default', expected)

    def test_existing_policy_is_backed_up_outside_rules(self):
        previous = b'# Previous policy\r\nKeep for restoration.\r\n'
        self.policy.write_bytes(previous)
        self.run_setup(*self.approval())
        backups = list((self.home / 'backups').glob('setup-cursor-*'))
        self.assertEqual(len(backups), 1)
        self.assertEqual((backups[0] / 'cursor-operating-policy.mdc').read_bytes(), previous)
        self.assertEqual(sorted(p.name for p in self.rules.iterdir()), ['cursor-operating-policy.mdc', 'personal.mdc'])

    def test_unapproved_write_is_rejected(self):
        self.run_setup(succeeds=False)
        self.assertFalse(self.policy.exists())

    def test_stale_policy_is_rejected(self):
        approval = self.approval()
        self.policy.write_text('Concurrent policy')
        self.run_setup(*approval, succeeds=False)
        self.assertEqual(self.policy.read_text(), 'Concurrent policy')
        self.assertFalse((self.home / 'backups').exists())

    def test_unreviewed_content_is_rejected(self):
        approval = self.approval()
        approval[2] = '0' * 64
        self.run_setup(*approval, succeeds=False)
        self.assertFalse(self.policy.exists())

    def test_rerun_is_unchanged(self):
        self.run_setup(*self.approval())
        before = self.policy.stat().st_mtime_ns
        output = self.run_setup(*self.approval()).stdout
        self.assertIn('Already current.', output)
        self.assertEqual(self.policy.stat().st_mtime_ns, before)
        self.assertFalse((self.home / 'backups').exists())

    def test_new_profile(self):
        self.home = Path(self.temp.name) / 'new-profile'
        self.policy = self.home / 'rules' / 'cursor-operating-policy.mdc'
        approval = self.approval()
        self.assertFalse(self.home.exists())
        self.run_setup(*approval)
        self.assertTrue(self.policy.is_file())
        self.assertEqual([p.name for p in (self.home / 'rules').iterdir()], ['cursor-operating-policy.mdc'])
        self.assertFalse((self.home / 'backups').exists())

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
        self.assertFalse(self.policy.exists())

    def test_missing_source_is_rejected(self):
        self.run_setup('-SourcePolicy', str(Path(self.temp.name) / 'absent.md'), '-WhatIf', succeeds=False)
        self.assertFalse(self.policy.exists())

    def test_empty_language_is_rejected(self):
        result = subprocess.run(['pwsh', '-NoProfile', '-File', str(SCRIPT), '-CursorHome', str(self.home),
                                 '-CommunicationLanguage', ' ', '-WritingLanguage', 'English',
                                 '-CodeLanguage', 'English', '-WhatIf'], capture_output=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse(self.policy.exists())


if __name__ == '__main__':
    unittest.main()
