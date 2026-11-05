"""Build the name-only Inter derivative. Requires fonttools (SIL OFL 1.1).

Keep outlines, metrics, kerning and all other features. Remove only calt so
digit-x-digit names show the literal x. Run from the repository root.
"""
from pathlib import Path
import shutil
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
for weight in ('Regular', 'Medium', 'SemiBold', 'Bold'):
    source = ROOT / 'assets/fonts' / f'Inter18pt-{weight}.ttf'
    font = TTFont(source, recalcTimestamp=False)
    # Empty the feature, rather than renumbering the Script/LangSys indices.
    for record in font['GSUB'].table.FeatureList.FeatureRecord:
        if record.FeatureTag == 'calt':
            record.Feature.LookupListIndex = []
            record.Feature.LookupCount = 0
    names = {
        1: 'Verus Name', 2: weight, 3: f'VerusName-{weight}',
        4: f'Verus Name {weight}', 6: f'VerusName-{weight}',
        16: 'Verus Name', 17: weight,
    }
    for record in font['name'].names:
        if record.nameID in names:
            record.string = names[record.nameID].encode(record.getEncoding())
    target = source.with_name(f'VerusName-{weight}.ttf')
    font.save(target)
    shutil.copyfile(target, ROOT / 'android/app/src/main/assets/fonts' / target.name)
