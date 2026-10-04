-- Periodontal readings outside the chart's limits could reach the database through the RPC.
-- These match validatePeriodontalReading: probing 0–15 mm, recession −5–15 mm, mobility and
-- furcation 0–3. NOT VALID checks new and updated rows without failing on any older reading;
-- VALIDATE CONSTRAINT can be run later once existing rows are reviewed.

alter table public.periodontal_measurements
  add constraint periodontal_measurements_probing_depth_range
    check (probing_depth is null or probing_depth between 0 and 15) not valid,
  add constraint periodontal_measurements_recession_range
    check (recession is null or recession between -5 and 15) not valid,
  add constraint periodontal_measurements_mobility_range
    check (mobility is null or mobility between 0 and 3) not valid,
  add constraint periodontal_measurements_furcation_range
    check (furcation is null or furcation between 0 and 3) not valid;
