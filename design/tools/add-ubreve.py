"""Adds the letters ŭ and Ŭ to the Sofia Sans files of the mockups.

    python design/tools/add-ubreve.py

Sofia Sans has no ŭ (U+016D) and no Ŭ (U+016C). The Belarusian Latin alphabet
needs them, and that is the alphabet in which OpenStreetMap and Wikidata give
the English names of many Places and streets: Poliakaŭ, Unichoŭski,
Mahilioŭskaja. Without the letter a browser takes it from another font.

The two letters are composed from parts the typeface already has: its own u
and its own breve, the one of ă. Where the breve sits over the u is not
guessed either: the typeface puts a macron over both a and u, and a breve
over a, so

    breve over u  =  macron over u  +  (breve over a  -  macron over a)

at every weight, since the three letters vary over the same regions.

The SIL Open Font License allows a modified version; the typeface declares no
Reserved Font Name. What was done is recorded beside the files, in
MODIFIED.txt. Needs fontTools and brotli; this script is run once, by hand,
and is kept so that the change can be repeated on a newer release.
"""

from pathlib import Path

from fontTools.ttLib import TTFont
from fontTools.ttLib.tables._g_l_y_f import Glyph, GlyphComponent
from fontTools.ttLib.tables.TupleVariation import TupleVariation
from fontTools.varLib import builder

FONTS = Path(__file__).resolve().parent.parent / "assets" / "fonts"
FAMILIES = ["sofia-sans", "sofia-sans-condensed", "sofia-sans-extra-condensed"]

# new glyph: (code point, the same base with a macron, a with a breve, a with a macron)
LETTERS = {
    "ubreve": (0x016D, "umacron", "abreve", "amacron"),
    "Ubreve": (0x016C, "Umacron", "Abreve", "Amacron"),
}

NOTE = """Sofia Sans in this folder differs from the released typeface in one respect.

The file {file} has two letters more: ŭ (U+016D) and Ŭ (U+016C), which the
typeface lacks and the Belarusian Latin alphabet needs. Each is composed from
the typeface's own u (or U) and its own breve, the one of ă (or Ă), placed by
the rule written in design/tools/add-ubreve.py, the script that made the change.
Nothing else was touched; the licence is unchanged (OFL.txt).
"""


def patch(path: Path) -> None:
    font = TTFont(path)
    glyf, gvar, hmtx, cmap = font["glyf"], font["gvar"], font["hmtx"], font.getBestCmap()
    order = font.getGlyphOrder()
    added = []
    for name, (code, base_macron, a_breve, a_macron) in LETTERS.items():
        if code in cmap:
            print(f"  {path.name}: U+{code:04X} is already there")
            continue
        model, breve, macron = glyf[base_macron], glyf[a_breve], glyf[a_macron]
        assert model.isComposite() and breve.isComposite() and macron.isComposite()
        base, accent_on_base = model.components
        _, breve_on_a = breve.components
        _, macron_on_a = macron.components

        glyph = Glyph()
        glyph.numberOfContours = -1
        glyph.components = []
        for component_name, x, y, flags in (
            (base.glyphName, base.x, base.y, base.flags),
            (
                breve_on_a.glyphName,
                accent_on_base.x + breve_on_a.x - macron_on_a.x,
                accent_on_base.y + breve_on_a.y - macron_on_a.y,
                breve_on_a.flags,
            ),
        ):
            component = GlyphComponent()
            component.glyphName, component.x, component.y, component.flags = component_name, x, y, flags
            glyph.components.append(component)

        # The same arithmetic on the way the offsets vary with weight.
        variations = []
        regions = zip(gvar.variations[base_macron], gvar.variations[a_breve], gvar.variations[a_macron])
        for on_base, on_a_breve, on_a_macron in regions:
            assert on_base.axes == on_a_breve.axes == on_a_macron.axes, "the letters vary over different regions"
            coordinates = list(on_base.coordinates)
            (bx, by), (ax, ay), (mx, my) = on_base.coordinates[1], on_a_breve.coordinates[1], on_a_macron.coordinates[1]
            coordinates[1] = (bx + ax - mx, by + ay - my)
            variations.append(TupleVariation(dict(on_base.axes), coordinates))

        order.append(name)
        glyf.glyphs[name] = glyph
        hmtx[name] = hmtx[base_macron]
        gvar.variations[name] = variations
        for table in font["cmap"].tables:
            if table.isUnicode():
                table.cmap[code] = name
        added.append((name, base_macron))

    if not added:
        return
    font.setGlyphOrder(order)
    glyf.glyphOrder = order

    # Advance widths vary through HVAR: the new letters take the widths of their models.
    hvar = font["HVAR"].table
    mapping = hvar.AdvWidthMap.mapping if hvar.AdvWidthMap else {g: i for i, g in enumerate(order[: -len(added)])}
    for name, model_name in added:
        mapping[name] = mapping[model_name]
    hvar.AdvWidthMap = builder.buildVarIdxMap([mapping[g] for g in order], order)

    if "GDEF" in font and font["GDEF"].table.GlyphClassDef:
        for name, model_name in added:
            font["GDEF"].table.GlyphClassDef.classDefs[name] = font["GDEF"].table.GlyphClassDef.classDefs.get(model_name, 1)

    font.save(path)
    (path.parent / "MODIFIED.txt").write_text(NOTE.format(file=path.name), encoding="utf-8")
    print(f"  {path.name}: added {', '.join(name for name, _ in added)}")


for family in FAMILIES:
    for file in sorted((FONTS / family).glob("*-latin-ext-*.woff2")):
        patch(file)
