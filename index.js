import express from 'express';
import { simulate } from './simulator.js';
const app = express();
const PORT = 8080;

app.use(express.json());

app.listen(
	PORT,
	() => console.log(`Live on ${PORT}`)
)

app.post('/simulate', async (req, res) => {
	let { from, to, value, data } = req.body;
	if (!value) {
		value = '0x0';
	}
	if (!data) {
		data = '0x0';
	}
	if (!from || !to) { 
		res.status(400).send({
			error: 'One or more required parameters not found'
		})
		return;
	}
	try {
		let simulationRes = await simulate({
			from: from,
			to: to,
			value: value,
			data: data,
		});
		res.status(200).send(simulationRes);
	} catch (err) {
		res.status(500).send({error : err.toString()});
	}
	return;
})