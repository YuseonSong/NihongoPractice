# KanjiVG stroke data

Copyright (C) 2009/2010/2011 Ulrich Apel and KanjiVG contributors.
Source: https://github.com/KanjiVG/kanjivg
Revision: 70a0b7ae0c18ceb5cb358274b029cce0234a43bc
Files: 92 SVG files for the 46 basic hiragana and 46 basic katakana in this directory.
Project: https://kanjivg.tagaini.net/
License: Creative Commons Attribution-ShareAlike 3.0 Unported
https://creativecommons.org/licenses/by-sa/3.0/
Full license: LICENSE.txt in this directory.

The original SVGs are unmodified. src/data/writing-strokes.json is derived
by sampling each cubic segment at 32 intervals, preserving stroke order and
direction. That derived dataset is distributed under the same CC BY-SA 3.0
license. Regenerate with scripts/generate-strokes.py. No font outlines or
inferred stroke orders are used.