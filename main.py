#!/usr/bin/python

import json
import pandas as pd

def load_json_to_dataframe(filename):
  rawdata = []
  with open(filename) as file:
    rawdata = json.load(file)

  data = pd.DataFrame(rawdata[1:], columns=rawdata[0])
  data['date'] = pd.to_datetime(data['date'])

  return data

if __name__ == "__main__":
  data = load_json_to_dataframe('data.json')
  print(data)
