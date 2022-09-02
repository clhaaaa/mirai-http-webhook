const Mirai = require('node-mirai-sdk');
const http = require('http');
const {URL} = require('url');
const config = require('./config.json');

const bot = new Mirai(config.mirai);
const {Plain, Image, At} = Mirai.MessageComponent;
const getTime = () => new Date().toLocaleString();
const ChatBot = require('dingtalk-robot-sender');

bot.onSignal('authed', () => {
	console.log(`${getTime()} 通过: ${bot.sessionKey} 认证中···`);
	bot.verify();
});

bot.onSignal('verified', () => {
	sendRawMessage('Webhook 已启用', null);
	console.log(`${getTime()} 通过: ${bot.sessionKey} 认证成功!\n`);
});

const robot = new ChatBot({
  webhook: 'https://oapi.dingtalk.com/robot/send?access_token=****'
});

function sendRawMessage(text, image, at) {
	let messageChain = [];
	if (text && text.length) {
		messageChain.push(Plain(text));
	}
	if (image && image.length) {
		messageChain.push(Image({url: image}));
	}
	if (text && text.length) {
		messageChain.push(At(At));
	}
	if (config.bot.isGroup) {
		bot.sendGroupMessage(messageChain, config.bot.admin);
		bot.sendGroupMessage(messageChain, config.bot.admin1);
		bot.sendGroupMessage(messageChain, config.bot.admin2);
		bot.sendFriendMessage(messageChain, config.bot.c);
	}
}

const server = http.createServer((req, res) => {
	const {searchParams} = new URL(req.url, 'http://localhost/');
	let token = searchParams.get('token');
	let text, image;
	if (req.method === 'GET') {
		text = searchParams.get('text');
		image = searchParams.get('image');
		at = searchParams.get('at');
		sendMessage(token, text, image, at);
	} else if (req.method === 'POST') {
		let body = [];
		req.on('data', (chunk) => {
			body.push(chunk);
		}).on('end', () => {
			body = Buffer.concat(body).toString();
			let contentType = req.headers['content-type'];
			if (contentType && contentType.includes('application/json')) {
				try {
					let content = JSON.parse(body);
					if (!token) token = content.token;
					text = content.text;
					image = content.image;
				} catch (e) {
					console.log(e);
				}
			} else if (contentType && contentType.includes('text/plain')) {
				text = body;
			}
			sendMessage(token, text, image, at);
		});
	}

	function sendMessage(token, text, image, at) {
		let result = {
			err: 0,
			msg: 'success',
		};
		if (config.webhook.token.length && config.webhook.token !== token) {
			result = {
				err: 1,
				msg: 'token',
			};
		} else {
			sendRawMessage(text, image, at);
			console.log(`${getTime()} webhook 调用成功`);
		}

		res.writeHead(200, {'Content-Type': 'application/json;charset=utf-8'});
		res.end(`{err: ${result.err}, msg: "${result.msg}"}`);
	}
});

server.listen(config.webhook.port, '0.0.0.0');

