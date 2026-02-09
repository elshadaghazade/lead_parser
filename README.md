# Lead Parser

This project reads **CSV or XLSX** files with leads data, validates each row by rules,  
and writes result to a new **XLSX** file with extra columns (**result**, **comment**).

It works with big files and reads data **line by line** (low memory usage)

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