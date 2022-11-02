import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const Web3 = require("web3");

import { logTracer } from './logTracer.js';
import fetch from 'node-fetch';
require('dotenv').config();

const erc20ABI = require('./abi/erc20_abi.json');
const erc721ABI = require('./abi/erc721_abi.json');
const erc165ABI = require('./abi/erc165_abi.json');
const erc1155ABI = require('./abi/erc1155_abi.json');

const wsoptions = {
    // Enable auto reconnection
    reconnect: {
        auto: true,
        delay: 5000, // ms
        maxAttempts: 5,
        onTimeout: false
    }
};

const providerURL = `https://late-frequent-liquid.quiknode.pro/${process.env.QN_API_KEY}/`;
const web3 = new Web3(new Web3.providers.HttpProvider(providerURL));
console.log('Web3 initialised');

const toJsonStr = (json) => { return JSON.stringify(json, null, 4) };

async function getContractType(address) {
	let result;
	let isERC721 = false;
	let isERC1155 = false;
	let isERC20 = false;
	try {
		const options = {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-qn-api-version': '1'
			},
			body: JSON.stringify({
				id: 67,
				jsonrpc: '2.0',
				method: 'qn_fetchNFTCollectionDetails',
				params: {
					'contracts': [ address ]
				}
			})
		}
        result = await fetch(providerURL, options);
        result = await result.json();
		
		if (result.result.length > 0) {
			if (result.result[0].erc721) { isERC721 = true; }
			else if (result.result[0].erc1155) { isERC1155 = true; }
		} else { isERC20 = true; }
    } catch (err) {
        console.log(err);
    }
	return {
		erc721 : isERC721,
		erc1155 : isERC1155,
		erc20 : isERC20
	}
}

function decodeLog(logObj, type) {
	const ret = {
		name : '',
		address : '',
		eventHash : '',
		data : {},
	}
	ret.address = logObj.address;

	const eventHash = logObj.topics.shift();

	const parseLog = (abi, prefix) => {
		abi.forEach((obj) => {
			if (obj.type === "event") {
				let _inputTypes = obj.inputs.map(input => input.type);
				let _hash = web3.utils.sha3(obj.name + '(' + _inputTypes.join() + ')');
				if (eventHash === _hash) {
					ret.name = prefix + '_' + obj.name;
					let _inputs = obj.inputs;
					ret.eventHash = _hash;
					let decodedLog = web3.eth.abi.decodeLog(_inputs, logObj.data, logObj.topics);
					_inputs.forEach(input => {
						ret.data[input.name] = decodedLog[input.name];
					})
				}
			}
		})
	}

	if (type.erc721) {
		parseLog(erc721ABI, 'erc721');
	} else if (type.erc1155) {
		parseLog(erc1155ABI, 'erc1155');
	} else if (type.erc20) {
		parseLog(erc20ABI, 'erc20');
	}
	return (ret.eventHash != '')? ret : undefined;
}

async function debugTraceTransaction(txObject) {
    let result;
    const options = {
        method: 'POST',
        headers: {accept: 'application/json', 'content-type': 'application/json'},
        body: JSON.stringify({
            id: 1,
            jsonrpc: '2.0',
            method: 'debug_traceCall',
            params: [
                txObject,
				'latest',
                {
					tracer: logTracer,
					enableMemory: true,
					enableReturnData: true,
					disableStorage: true
				}
            ]
          })
      };
    
    try {
        result = await fetch(providerURL, options);
        result = await result.json();
    } catch (err) {
        console.log(err);
    }
    return result;
}

export const simulate = async (txObject) => {
	let ret = {};
	ret.logs = [];
	ret.errors = [];
	let contractTypes = new Map();
	let txValue = web3.utils.hexToNumberString(txObject.value);
	if (txValue != '0') {
		let res = {
			name: 'eth_Transfer',
			data: {
				from: txObject.from,
				to: txObject.to,
				value: txValue,
			},
		}
		ret.logs.push(res);
	}
    let tracedCalls = await debugTraceTransaction(txObject);
	let results = tracedCalls.result;
	if (!results) {
		throw 'Unable to parse given data';
	}
	for (let x of results) {
		x = JSON.parse(toJsonStr(x));
		if (x.type === 'log') {
			contractTypes.set(x.address, contractTypes.get(x.address) || await getContractType(x.address));
			let decodedLog = decodeLog(x, contractTypes.get(x.address));
			if (decodedLog) {
				ret.logs.push(decodedLog);
			}
		} else if (x.type === 'revert') {
			try {
				x.message = web3.eth.abi.decodeParameter('string', x.data.slice(10));
			} catch (err) {}
			ret.logs = [];
			ret.errors.push(x);
		} 
		else if (x.type === 'eth_Transfer') {
			let res = {
				name: 'eth_Transfer',
				data: {
					from: x.from,
					to: x.to,
					value: x.value,
				},
			}
			ret.logs.push(res);
		}
	}
	return ret;
}

