# Historical Map Visualization Project

A project for visualizing historical maps using data from Wikidata. The application allows viewing and analyzing historical state boundaries, capitals, and other geographical data.

## Features

- Visualization of historical state boundaries
- Information about state formation and dissolution dates

## Requirements

- Modern web browser (Chrome, Firefox or Edge)
- Python 3.x (for running the server)
- Node.js (version 14 or higher) - for data processing scripts

## Installation

1. Clone the repository

2. Start the server:
```bash
python -m http.server 8000
```

3. Open your browser and navigate to:
```
http://localhost:8000/Historic Map.html
```

## Data Format

Data is stored in JSON format with the following structure:
- Geometric data of state boundaries
- Properties:
  - Country name
  - Area
  - Population
  - Capital and its coordinates
  - Formation and dissolution dates
  - ISO country code
  - Wikidata ID
