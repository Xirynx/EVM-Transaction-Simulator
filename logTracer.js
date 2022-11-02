export const logTracer = "{\n" +
"    data: [],\n" +
"    fault: function (log) {\n" +
"    },\n" +
"    intArrToHexStr: function (arr) {\n" +
"        arr = arr.map(function(val) {\n" +
"	         return val.toString(16).padStart(2,'0');\n" +
"	     });\n" +
"	     return '0x' + (arr.join(''));\n" +
"	 },\n" +
"    dec2hex: function (str){\n" +
"        let dec = str.toString().split(''), sum = [], hex = [], i, s\n" +
"        while(dec.length){\n" +
"            s = 1 * dec.shift()\n" +
"            for(i = 0; s || i < sum.length; i++){\n" +
"                s += (sum[i] || 0) * 10\n" +
"                sum[i] = s % 16\n" +
"                s = (s - sum[i]) / 16\n" +
"            }\n" +
"        }\n" +
"        while(sum.length){\n" +
"            hex.push(sum.pop().toString(16))\n" +
"        }\n" +
"        return hex.join('')\n" +
"    },\n" +
"    step: function (log) {\n" +
"        let topicCount = (log.op.toString().match(/LOG(\\d)/) || [])[1];\n" +
"		 let isError = (log.op.toString().match(/REVERT/));\n" +
"        if (isError) {\n" +
"	         let unformattedData = Object.values(log.memory.slice(parseInt(log.stack.peek(0)), parseInt(log.stack.peek(0)) + parseInt(log.stack.peek(1))));\n" +
"	         let res = {\n" +
"	             type: 'revert',\n" +
"	             data: this.intArrToHexStr(unformattedData),\n" +
"	         }\n" +
"	         this.data.push(res);\n" +
"	     }\n" +
"        if (topicCount) {\n" +
"            let unformattedAddress = Object.values(log.contract.getAddress());\n" +
"            let unformattedData = Object.values(log.memory.slice(parseInt(log.stack.peek(0)), parseInt(log.stack.peek(0)) + parseInt(log.stack.peek(1))));\n" +
"            let res = {\n" +
"                type: 'log',\n" +
"                address: this.intArrToHexStr(unformattedAddress),\n" +
"                topics: [],\n" +
"                data: this.intArrToHexStr(unformattedData),\n" +
"            };\n" +
"            for (let i = 0; i < topicCount; i++) {\n" +
"                let tempTopic = '0x' + (this.dec2hex(log.stack.peek(i + 2))).padStart(64,'0');\n" +
"                res.topics.push(tempTopic);\n" +
"            }\n" +
"            this.data.push(res);\n" +
"        }\n" +
"    },\n" +
"    enter: function (callFrame) {\n" +
"	     let res = {\n" +
"		    type: 'eth_Transfer',\n" +
"           from: this.intArrToHexStr(Object.values(callFrame.getFrom())),\n" +
"           to: this.intArrToHexStr(Object.values(callFrame.getTo())),\n" +
"           value: String(callFrame.getValue())\n" +
"	     }\n" +
"	     if (callFrame.getValue() && String(callFrame.getValue()) != '0') { this.data.push(res); }\n" +
"    },\n" +
"    exit: function (frameResult) {},\n" +
"    result: function () {\n" +
"        return this.data;\n" +
"    }\n" +
"}"