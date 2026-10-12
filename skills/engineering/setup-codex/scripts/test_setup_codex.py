import os
from pathlib import Path
import subprocess
import tempfile
import unittest


SCRIPT = Path(__file__).with_name('setup-codex.ps1')


class RetiredInstallerTests(unittest.TestCase):
    def test_legacy_invocations_fail_without_changing_profiles(self):
        with tempfile.TemporaryDirectory(prefix='setup-codex-test-') as directory:
            root = Path(directory)
            profiles = root / 'profiles'
            profiles.mkdir()
            # PowerShell writes startup caches outside the harness profiles.
            runtime = root / 'runtime'
            runtime.mkdir()
            home = profiles / 'profile'
            home.mkdir()
            fixtures = {
                'AGENTS.md': b'# Existing preferences\r\nKeep me.\r\n',
                'config.toml': b'model_instructions_file = "old.md"\r\n',
                'instructions/codex-operating-policy.md': b'# Old policy\n',
                'rules/cursor-operating-policy.mdc': b'---\nalwaysApply: true\n---\n',
            }
            for name, content in fixtures.items():
                target = home / name
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(content)
            environment = dict(os.environ, HOME=str(runtime), USERPROFILE=str(runtime),
                               CODEX_HOME=str(home))

            def snapshot():
                return {
                    str(path.relative_to(profiles)): (
                        path.read_bytes(), path.stat().st_mtime_ns
                    ) if path.is_file() else None
                    for path in profiles.rglob('*')
                }

            before = snapshot()
            common = ['-CodexHome', str(home), '-CommunicationLanguage', 'French',
                      '-WritingLanguage', 'English', '-CodeLanguage', 'English']
            cases = [[], [*common, '-WhatIf'], [*common, '-ApproveInstall'],
                     [*common, '-ApproveInstall', '-ApprovedContentHash', '0' * 64,
                      '-ExpectedPolicyHash', 'MISSING'],
                     ['-CodexHome', str(profiles / 'missing-profile')]]
            for arguments in cases:
                with self.subTest(arguments=arguments):
                    result = subprocess.run(
                        ['pwsh', '-NoProfile', '-NonInteractive', '-File',
                         str(SCRIPT.resolve()), *arguments],
                        env=environment, cwd=root, capture_output=True,
                        text=True, encoding='utf-8', timeout=30,
                    )
                    self.assertNotEqual(result.returncode, 0)
                    self.assertIn('setup-harness', result.stdout + result.stderr)
                    self.assertEqual(before, snapshot())
                    self.assertFalse((runtime / '.cursor').exists())
                    self.assertFalse((runtime / '.codex').exists())


if __name__ == '__main__':
    unittest.main()
