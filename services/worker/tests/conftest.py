import os
import sys

_HERE = os.path.dirname(__file__)
_REPO_ROOT = os.path.abspath(os.path.join(_HERE, "..", "..", ".."))

for path in (
    os.path.join(_HERE, "..", "src"),
    os.path.join(_REPO_ROOT, "contracts", "gen", "python"),
):
    if path not in sys.path:
        sys.path.insert(0, path)
