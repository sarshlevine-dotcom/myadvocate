INSERT INTO public.resource_routes (state_code, issue_type, resource_name, url) VALUES
('CA', 'denial', 'California Department of Managed Health Care', 'https://www.dmhc.ca.gov/FileAComplaint.aspx'),
('CA', 'billing', 'California Medical Board Consumer Complaint', 'https://www.mbc.ca.gov/Consumers/'),
('TX', 'denial', 'Texas Department of Insurance Complaint', 'https://www.tdi.texas.gov/consumer/complain.html'),
('TX', 'billing', 'Texas Medical Board Patient Information', 'https://www.tmb.state.tx.us/page/patients'),
('NY', 'denial', 'New York State Department of Financial Services', 'https://www.dfs.ny.gov/complaint'),
('NY', 'billing', 'New York State Health Department', 'https://www.health.ny.gov/health_care/complaints/')
ON CONFLICT DO NOTHING;
