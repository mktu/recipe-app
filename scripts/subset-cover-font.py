"""
表紙（/api/cover）用の日本語フォントを作る

Noto Sans JP の可変フォントを太字（700）に固定し、JIS X 0208（第 1・第 2 水準）の文字に絞る。
元のままだと約 9MB あり、可変フォントは Satori（next/og）が扱えないため。
料理名に第 2 水準の外の字があると、その字は表紙に出ない（表紙は AI 画像ができるまでの仮の絵なので許容）。

使い方（fonttools が要る: pip install fonttools）:
  curl -sLo NotoSansJP.ttf 'https://github.com/google/fonts/raw/main/ofl/notosansjp/NotoSansJP%5Bwght%5D.ttf'
  python3 scripts/subset-cover-font.py NotoSansJP.ttf assets/fonts/NotoSansJP-Bold-subset.ttf
"""

import sys

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer


def jis_characters() -> str:
    chars = {chr(c) for c in range(0x20, 0x7F)}
    for code in range(0x3000, 0xFFF0):
        ch = chr(code)
        try:
            ch.encode('euc_jp')
        except UnicodeEncodeError:
            continue
        chars.add(ch)
    return ''.join(sorted(chars))


def main(src: str, dest: str) -> None:
    font = TTFont(src)
    font = instancer.instantiateVariableFont(font, {'wght': 700})
    options = subset.Options()
    options.layout_features = []
    options.name_IDs = ['*']
    options.notdef_outline = True
    options.hinting = False
    subsetter = subset.Subsetter(options)
    subsetter.populate(text=jis_characters())
    subsetter.subset(font)
    font.save(dest)


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
