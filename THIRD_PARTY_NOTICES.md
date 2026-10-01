# Third-party notices

Inbox's own code is MIT-licensed (see [LICENSE](LICENSE)). The downloadable app (`Inbox.dmg`) also bundles the following software, which keeps its own license:

| Component | License | Where |
|---|---|---|
| [CPython 3.13](https://www.python.org/) | [Python Software Foundation License](https://docs.python.org/3/license.html) | Full text inside the app at `Contents/Resources/python/<arch>/lib/python3.13/LICENSE.txt` |
| [python-build-standalone](https://github.com/astral-sh/python-build-standalone) (the build of CPython used) | [BSD 3-Clause](https://github.com/astral-sh/python-build-standalone/blob/main/LICENSE) | |
| Libraries built into that Python: OpenSSL, libffi, SQLite, XZ Utils, bzip2, zlib, mpdecimal, libedit/ncurses, expat, Tcl (removed) | Apache 2.0, MIT, public domain, BSD-style and zlib licenses respectively | See the [python-build-standalone docs](https://gregoryszorc.com/docs/python-build-standalone/main/) for the per-component license list |

The source repository doesn't include any of this software. `build.sh` downloads it at build time.

"iCloud" is a trademark of Apple Inc. Inbox is an independent project and isn't affiliated with or endorsed by Apple.
