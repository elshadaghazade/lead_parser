# Lead Parser

This project reads **CSV or XLSX** files with leads data, validates each row by rules,  
and writes result to a new **XLSX** file with extra columns (**result**, **comment**).

It works with big files and reads data **line by line** (low memory usage)


## IMPORTANT!
### Country / Region check note
If the sheet has only region or county in the location column (not full country),
and the file has many rows (50–70k), I would do this:

## 1st SIMPLE & THE FASTEST SOLUTION

CASE: If some rows contains proper country and regions

1. prepare region / country mapping
    - create a static map (JSON or in-memory object)
    - example: Sydney > Australia, California > USA
    - mapping is loaded once at start
2. normalize location text
    - convert location to lowercase
    - remove extra spaces and symbols, this helps to match regions correctly
3. resolve country by lookup
    - for each row try to find country by region name
    - use simple string match
4. process rows one by one
    - use streaming read row by row
    - do not load full file into memory
    - each row is checked independently
5. handle unknown regions
    - If region cannot be matched to country then mark row as RECHECK
6. performance
    - use in-memory hash map for lookup - complexity is O(1)
    - One pass over file - complexity is O(n)
    - no external API calls during processing

## 2nd ADVANCED SOLUTION
CASE: If file completely does not contain proper country and regions

1. Prepare geo database
    - create tables with full list of:
        - countries
        - regions, states, provinces
        - cities
    - data source can be imported once from csv of sql dump
2. postgres as source of truth
    - store all geo data in postgres
    - create indexes on normalized names
    - country_name_norm
    - region_name_norm
    - city_name_norm
    - alias_name_norm
3. normalize input location
    - lowercase
    - remove extra symbols and spaces
    - save as location_norm
4. fast lookup with redis cache
    - before calling postgres, check redis
    - key - geo:loc:[location norm]
    - value - resolved country or unknown
5. if not in redis
    - query postgres
    - store result in redis with TTL (for example 7 days)
6. performance
    - performance will be slow than 1st solution

---

## Prerequisites

- Node.js **18+**
- npm

---

## Install

```bash
npm install
```

## Run in development mode
Run project directly from TypeScript source:

```bash
npm run dev -- <input.csv|input.xlsx> <output.xlsx>
```

Example:

```bash
npm run dev -- ./data/input.xlsx ./data/output.xlsx
```

## Build for production
Compile TypeScript to JavaScript:

```bash
npm run build
```

## Run in production mode
After build, run compiled code:

```bash
npm start -- <input.csv|input.xlsx> <output.xlsx>
```

Example:

```bash
npm start -- ./data/input.xlsx ./data/output.xlsx
```

## Generate documentation
This project uses **TypeDoc** to generate documentation from code comments.

Create documentation website:

```bash
npm run docs
```

Documentation will be generated in ./docs folder.

## View documentation in browser

```bash
npm run docs:serve
```

Open in browser:

```
http://localhost:8080
```

## Validation logic
Validation rules are selected by sub_status field (strategy pattern):

- Title/PL Summary - check title similarity with requirements
- Other (auto) – check company and lead data
- Prooflink – check prooflink format and domain
- NWC – check status values

## Demo video
Video demo and explanation is available on YouTube:

[DEMO VIDEO](https://youtu.be/roefyxgfbmw)