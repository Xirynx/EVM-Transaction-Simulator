import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import express from 'express';
import { simulate } from './simulator.js';
import fetch from 'node-fetch';

require('dotenv').config();

const alchemyNodeURL = `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCH_API_KEY}`;

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
			error: `'from' and 'to' addresses are required parameters`
		});
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

app.post('/retrieve/token-details', async (req, res) => {
	let { address } = req.body;
	if (!address) {
		res.status(400).send({
			error: `'address' is a required parameter`
		});
		return;
	}
	const options = {
		method: 'POST',
		headers: {accept: 'application/json', 'content-type': 'application/json'},
		body: JSON.stringify({
			id: 1,
			jsonrpc: '2.0',
			method: 'alchemy_getTokenMetadata',
			params: [address]
		})
	};
	fetch(alchemyNodeURL, options)
		.then(alchemyRes => alchemyRes.json())
		.then(json => res.status(200).send(json))
		.catch(err => res.status(500).send(err));
})

app.post('/retrieve/nft-details', async (req, res) => {
	let { address, tokenId, tokenType } = req.body;
	if (!address || !tokenId) {
		res.status(400).send({
			error: `'address' and 'tokenId' addresses are required parameters`
		});
		return;
	}
	const options = {
		method: 'GET',
		headers: {accept: 'application/json'}
	}
	fetch(
		`${alchemyNodeURL}/getNFTMetadata?${'contractAddress=' + address}${tokenId? '&tokenId=' + tokenId : ''}${tokenType? '&tokenType=' + tokenType : ''}&refreshCache=false`, 
		options
	)
		.then(alchemyRes => alchemyRes.json())
		.then(json => res.status(200).send(json))
		.catch(err => res.status(500).send(err));
})