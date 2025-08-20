import React, { useState, useEffect} from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { IFactory } from '@climadex/types';
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Legend, Tooltip } from 'recharts';

async function fetchReport(reportId = null) {
  const res = await fetch(`http://localhost:3000/reports/${encodeURIComponent(reportId)}`);
  const json = await res.json();
  return json;
}

export function ReportPage() {
  const [factory, setFactory] = useState<IFactory & { evolution?: {year: string; temperature: number }[] }>();
  const params = useParams();
  const navigate = useNavigate();
  useEffect(() => {
   if (params.reportId)
    {
       fetchReport(params.reportId).then((json) => { 
         setFactory(() => json.factory);
       }).catch(() => {
         navigate("/*")
       });
     }
  }, [params.reportId]);

  return (
    <>
      <Link to="/factories" className="backLink" style={{ marginBottom: "2rem", display: "inline-block" }}>
        &lsaquo; Back to factories
      </Link>
      <h2>{factory?.factoryName}</h2>
      <p>
          Risk assessment: <strong>{factory?.riskAssessment}</strong>
      </p>
      {factory?.evolution && (
        <LineChart
          width={900}
          height={600}
          data={factory.evolution}
          margin={{ top: 50, right: 50, bottom: 50, left: 50 }}
        >
          <defs>
            <linearGradient id="tempGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="green" />
              <stop offset="50%" stopColor="orange" />
              <stop offset="100%" stopColor="red" />
            </linearGradient>
          </defs>
          <CartesianGrid
            stroke="#ccc"
            strokeDasharray="5 5"
          />
          <XAxis dataKey="year" />
          <YAxis label={{ value: '°C', angle: 0, position: 'insideLeft' }} />
          <Tooltip />
          <Legend
           align="center"
           formatter={(value) => <span style={{ color: "black"}}>{value}</span>}
          />
          <Line
            type="monotone"
            dataKey="temperature"
            stroke="url(#tempGradient)"
            strokeWidth={2}
            name="Temp evolution"
          />
        </LineChart>
      )}
    </>
  );
}

