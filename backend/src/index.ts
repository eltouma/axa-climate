import { serve } from '@hono/node-server';
import { Hono, Context } from 'hono';
import { cors } from 'hono/cors';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

import { IFactory } from '@climadex/types';
import { IDbFactory } from './types';

import { getMeanTemperatureWarmestQuarter, TIMEFRAMES, TimeFrame } from './indicators';

const app = new Hono();

const dbClientPromise = open({
  filename: '../../db.sqlite3',
  driver: sqlite3.Database,
});

app.use('/*', cors());

app.get('/', (c) => {
  // Here is an example of how to read temperatures previsions from the dataset

  const values = [];

  for (const timeframe of TIMEFRAMES) {
    values.push({
      [timeframe]: `${getMeanTemperatureWarmestQuarter({
        latitude: 48.8711312,
        longitude: 2.3462203,
        timeframe: timeframe,
      })}°C`,
    });
  }

  return c.text(
    `Example evolution of temperatures over timeframes : ${JSON.stringify(
      values
    )}`
  );
});

app.get('/factories', async (c: Context) => {
  const client = await dbClientPromise;

  const query = c.req.query('q');
  const updateRisk = `UPDATE factories SET riskAssessment = ? WHERE id = ?`;

  const factories = query
    ? await client.all(
        `SELECT * FROM factories WHERE LOWER( factory_name ) LIKE ?;`,
        [`%${query.toLowerCase()}%`]
      )
    : await client.all('SELECT * FROM factories');

  const updateFactories = [];
  for (const f of factories) {
    let riskAssessment = f.risk_assessment;
    if (riskAssessment === null) {
      const risks: number[] = [];
      for (const timeframe of TIMEFRAMES) {
	const tmp = await getMeanTemperatureWarmestQuarter({
	  latitude: f.latitude,
          longitude: f.longitude,
          timeframe
          });
         risks.push(tmp);
       }
       riskAssessment = risks.some((risk) => risk >= 34) ? 'High': 'Low';
       await client.run(updateRisk, riskAssessment, f.id);
      }
      updateFactories.push(riskAssessment);
  }
  
  return c.json(
    factories.map(
      (factory: IDbFactory, index: number): IFactory => ({
        id: factory.id,
        factoryName: factory.factory_name,
        address: factory.address,
        country: factory.country,
        latitude: factory.latitude,
        longitude: factory.longitude,
        yearlyRevenue: factory.yearly_revenue,
	riskAssessment: updateFactories[index],
      })
    )
  );
});

app.post('/factories', async (c: Context) => {
  const client = await dbClientPromise;

  const { factoryName, country, address, latitude, longitude, yearlyRevenue } =
    await c.req.json();
  if (!factoryName || !country || !address || !yearlyRevenue) {
    return c.text('Invalid body.', 400);
  }

  const temperatures: number[] = [];

  for (const timeframe of TIMEFRAMES) {
    const value = getMeanTemperatureWarmestQuarter({
      latitude: +latitude,
      longitude: +longitude,
      timeframe,
    })
    if (value !== null)
      temperatures.push(value);
    else
      return c.json({ error: 'Failed to get temperature' }, 500);
  }

  const riskAssessment = temperatures.some((temp) => temp >= 34) ? 'High': 'Low';

  const factory: IFactory = {
    factoryName,
    country,
    address,
    latitude: +latitude,
    longitude: +longitude,
    yearlyRevenue: +yearlyRevenue,
    riskAssessment,
  };

  await client.run(
    `INSERT INTO factories (factory_name, address, country, latitude, longitude, yearly_revenue, risk_assessment)
VALUES (?, ?, ?, ?, ?, ?, ?);`,
    factory.factoryName,
    factory.address,
    factory.country,
    factory.latitude,
    factory.longitude,
    factory.yearlyRevenue,
    factory.riskAssessment
  );

  return c.json({ result: 'OK' });
});

app.get('/reports/:reportId', async (c: Context) => {
  const client = await dbClientPromise;
  const id = c.req.param('reportId');

  const factory = await client.get('SELECT * FROM factories WHERE id = ?;', id);

  const temperatures = [];
  for (const timeframe of TIMEFRAMES) {
    const temp = await getMeanTemperatureWarmestQuarter({
      latitude: factory.latitude,
      longitude: factory.longitude,
      timeframe,
    });
    temperatures.push({ year: timeframe, temperature: temp });
  }
  return c.json({
    factory: {
      factoryName: factory.factory_name,
      address: factory.address,
      country: factory.country,
      latitude: factory.latitude,
      longitude: factory.longitude,
      yearlyRevenue: factory.yearly_revenue,
      riskAssessment: factory.risk_assessment,
      evolution: temperatures,
    }
  });
});

serve(app);
