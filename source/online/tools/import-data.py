"""Normalize original open data, preserve provenance and never invent missing values."""
import hashlib
import json
from pathlib import Path
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'data'


def write(name, value):
    (DATA / name).write_text(json.dumps(value, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')


exercises = json.loads((DATA / 'exercises.raw.json').read_text(encoding='utf-8'))
write('exercises.json', [{key: e.get(key) for key in ['id', 'name', 'force', 'level', 'mechanic', 'equipment', 'primaryMuscles', 'secondaryMuscles', 'instructions', 'category']} for e in exercises])

nutrients = {1008:'kcal',1003:'protein_g',1004:'fat_g',1005:'carbs_g',1079:'fiber_g',1093:'sodium_mg',1087:'calcium_mg',1089:'iron_mg',1092:'potassium_mg',1051:'water_g'}
foods = {}
archives = ['usda-sr.raw.zip', 'usda-foundation.raw.zip']
for archive in archives:
    with ZipFile(DATA / archive) as z:
        filename = next(n for n in z.namelist() if n.endswith('.json'))
        document = json.loads(z.read(filename))
    for records in document.values():
        for f in records:
            if not isinstance(f, dict) or 'fdcId' not in f:
                continue
            values = {k: None for k in nutrients.values()}
            for n in f.get('foodNutrients', []):
                nutrient = n.get('nutrient', {})
                if nutrient.get('id') in nutrients:
                    values[nutrients[nutrient['id']]] = n.get('amount')
            foods[f['fdcId']] = {'id':str(f['fdcId']), 'name':f['description'], 'dataset':f.get('dataType', 'USDA'), 'basis':'每 100 g 可食部分；生熟以原条目名称为准', **values}

write('foods.json', list(foods.values()))
manifest = {'imported_at':'2026-10-25', 'exercises':len(exercises), 'foods':len(foods),
            'exercise_source':'https://github.com/yuhonas/free-exercise-db',
            'food_source':'https://fdc.nal.usda.gov/download-datasets/',
            'files':{f:{'sha256':hashlib.sha256((DATA/f).read_bytes()).hexdigest(), 'bytes':(DATA/f).stat().st_size} for f in ['exercises.raw.json', *archives]},
            'licenses':{'foods':'CC0 / public domain', 'exercise_text':'Unlicense per upstream repository; images not imported'}}
write('manifest.json',manifest)
print(json.dumps({k:v for k,v in manifest.items() if k in ['imported_at','exercises','foods']}))
