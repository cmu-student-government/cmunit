#!/usr/bin/env python

import pandas as pd

import argparse
import csv
import os
import json

"""  
How to get the original data:
- Go to https://cmu.smartevals.com/
- Click the bar chart icon in the bottom of the page 
    (a table with course info will open)
- Click "Export to.." button in the top left corner, select CSV
 

Available columns:

Index([
    u'Year', 
    u'Semester',  # (Fall|Spring|Summer) 
    u'Course ID', 
    u'Section',  # ('Q' stands for Qatar)
    u'Course Name', 
    u'Name', # (instructor name)
    u'Hrs Per Week', u'Hrs Per Week 5', u'Hrs Per Week 8',
        # float with two decimals 
        # there is one record having two values; all others have only one
        
    # not used by CMUnits:
    u'Level',  # (e.g. 'Graduate') 
    u'College',  # (e.g. 'School of Computer Science') 
    u'Dept',  # (e.g. 'CS') 
    u'Num Respondents', u'Response Rate %', 
    u'Possible Respondents',
    u'Interest in student learning',
    u'Clearly explain course requirements',
    u'Clear learning objectives & goals',
    u'Instructor provides feedback to students to improve',
    u'Demonstrate importance of subject matter',
    u'Explains subject matter of course', 
    u'Show respect for all students',
    u'Overall teaching rate', u'Overall course rate'],
      dtype='object')
      
The goal is to get a dict of chunks like:

{
    "02201":{
        "name":"PRGRMMING SCIENTISTS",
        "year":"2014",
        "instructor":"CARLETON KINGSFORD",
        "hrs":14.2,
        "date":"2014-09"
    },
    ...
}
"""


if __name__ == '__main__':
    parser = argparse.ArgumentParser(
        description="Compile CSV exported from FCE into a machihne-readable "
                    "format")
    parser.add_argument('--callback', default="", nargs="?",
                        help='JSONP callback to enable cross-domain requests. '
                             'Default: none')
    parser.add_argument('-i', '--input', default="docs/table.csv", nargs="?",
                        type=argparse.FileType('r'),
                        help='Input CSV file, exported from cmu.smartevals.com.'
                             ' Default: ./docs/table.csv.')
    parser.add_argument('-o', '--output', default="docs/fce.json", nargs="?",
                        type=argparse.FileType('w'),
                        help='Filename to export JSON data. '
                             'Default: ./docs/fce.json')
    args = parser.parse_args()

    df = pd.read_csv(args.input).rename(
        columns={'Year': 'year', 'Name': 'instructor', 'Course Name': 'name'})

    df = df[(df['Section'] != "Q") & (df['Section'] != "W")]
    df['month'] = df['Semester'].map({
        'Fall': 9,
        'Spring': 1,
        'Summer': 6
    }).fillna(0)  # starting Summer 2019, Semester is empty
    df['date'] = df['year'].astype(str) + '-0' + df['month'].astype(str)

    df['hrs'] = df[['Hrs Per Week', 'Hrs Per Week 5', 'Hrs Per Week 8']].max(axis=1)
    df = df[pd.notnull(df['hrs']) & (df['Num Respondents'] > 5)]

    # clean up course name: "10701", "10-701", "F14-10-701"
    df['course id'] = df['Course ID'].map(
        lambda s: "".join(c for c in s if c.isdigit())[-5:])

    # Summer courses are usually more intensive and thus not representative
    df = df[df["Semester"] != "Summer"]
    # information older than two years is probably not relevant
    df = df[df['year'] > 2017]

    hrs = df[
        ['course id', 'name', 'year', 'instructor', 'hrs', 'date']].sort_values(
        'date', ascending=False).groupby('course id').first()

    data = hrs.to_json(orient='index', double_precision=1)

    if args.callback:
        data = "".join([args.callback, "(", data, ");"])

    args.output.write(data)
