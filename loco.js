(function () {
	
	
	async function fetchWithTimeout(URL, timeout=8000){ // ref: https://dmitripavlutin.com/timeout-fetch-request/
		try {
			const controller = new AbortController();
			const timeout_id = setTimeout(() => controller.abort(), timeout);
			const response = await fetch(URL, {...{timeout:timeout}, signal: controller.signal});
			clearTimeout(timeout_id);
			return response;
		} catch(e){
			errorlog(e);
			return await fetch(URL); // iOS 11.x/12.0
		}
	}


	function getAllContentNodes(element) {
		var resp = "";
		element.childNodes.forEach(node=>{
			if (node.childNodes.length){
				resp += getAllContentNodes(node)
			} else if ((node.nodeType === 3) && (node.textContent.trim().length > 0)){
				if (settings.textonlymode){
					resp += node.textContent.trim()+" ";
				} else {
					resp += node.textContent.trim()+" ";
				}
			} else if (node.nodeType === 1){
				if (settings.textonlymode){
				//	if ("alt" in node){
				//		resp += node.alt.trim()+" ";
					//}
				} else {
					resp += node.outerHTML;
				}
			} 
		});
		return resp;
	}
	
	var lastMessage = "";
	var lastUser  = "";
	
	function processMessage(ele){	// twitch
	
	  var chatsticker = false;
	  var chatmessage = "";
	  var nameColor = "";
	  
	  try {
		  try {
			var nameEle = ele.querySelector("div:nth-of-type(2) > div:nth-of-type(1) > span:nth-of-type(1)");
			var chatname = nameEle.innerText;
		  } catch(e){
			  console.log(ele);
			  console.log(e);
			 return;
		  }
	 } catch(e){
		try {
			var nameEle = ele.querySelector("div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1)");
			var chatname = nameEle.innerText;
		  } catch(e){
			console.log(ele);
			console.log(e);
			return;
		  }
	  }
	  
	  chatname = chatname.trim();
	  if (!chatname){return;}
	  
	  var chatbadges = [];
	  var hasDonation = '';
	  
	  try {
		var eleContent = ele.querySelector("div:nth-of-type(2) > div:nth-of-type(1) > span:nth-of-type(2)");
		chatmessage = getAllContentNodes(eleContent);
	  } catch(e){ // donation?
		  try {
			var eleContent = ele.querySelector("div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(2)");
			chatmessage = getAllContentNodes(eleContent);
			if (chatmessage && (chatmessage == parseInt(chatmessage))){
				// hasDonation = parseInt(chatmessage) + " gold"; // this is way too annoying to show..
				chatmessage = "";
			}
		  } catch(e){
			  return;
		  }
	  }
	  
	 if (chatmessage){
		 chatmessage = chatmessage.trim();
	 }
	 
	  if (chatmessage && chatmessage.includes("[Message ");
		  return; // I'm assuming this is a deleted message
	  }
	 
	 if ((lastMessage === chatmessage) && (lastUser === chatname)){
		  lastMessage = "";
		  chatname = "";
		  return;
	  } else {
		lastMessage = chatmessage;
		lastUser = chatname;
	  }
	  
	  
	  var chatimg = "";
	  try {
			chatimg =  ele.querySelector("div:nth-of-type(1) > span>img[src]").src;
			if (chatimg && !chatimg.startsWith("https://loco.gg/")){
				chatimg = "https://loco.gg" + chatimg;
			}
			chatimg = chatimg.replace(".jpg&w=48&q=25", ".jpg&w=128&q=80");
	  } catch(e){}

	  
	 
	  if (!chatmessage && !hasDonation){
		return;
	  }

	  var data = {};
	  data.chatname = chatname;
	  data.chatbadges = chatbadges;
	  data.nameColor = nameColor;
	  data.chatmessage = chatmessage;
	  data.chatimg = chatimg;
	  data.hasDonation = hasDonation;
	  data.hasMembership = "";
	  data.type = "loco";
	  
	//  console.log(data);
	  
	 
	  try {
		chrome.runtime.sendMessage(chrome.runtime.id, { "message": data }, function(e){});
	  } catch(e){
		  //
	  }
	}

	chrome.runtime.onMessage.addListener(
		function (request, sender, sendResponse) {
			try{
				if ("focusChat" == request){
					document.querySelector('[data-a-target="chat-input"]').focus();
					sendResponse(true);
					return;
				}
				if (typeof request === "object"){
					if ("settings" in request){
						settings = request.settings;
						sendResponse(true);
						return;
					}
				}
				// twitch doesn't capture avatars already.
			} catch(e){}
			sendResponse(false);
		}
	);
	
	var settings = {};
	// settings.textonlymode
	// settings.streamevents
	
	
	chrome.runtime.sendMessage(chrome.runtime.id, { "getSettings": true }, function(response){  // {"state":isExtensionOn,"streamID":channel, "settings":settings}
		if ("settings" in response){
			settings = response.settings;
		}
	});

	function onElementInserted(target) {
		var onMutationsObserved = function(mutations) {
			
			mutations.forEach(function(mutation) {
				if (mutation.addedNodes.length) {
					for (var i = 0, len = mutation.addedNodes.length; i < len; i++) {
						try {
							if (mutation.addedNodes[i].nodeName.toLowerCase() !== "div"){continue;}
							if (mutation.addedNodes[i].role){continue;}
							if (mutation.addedNodes[i].ignore){continue;}
							mutation.addedNodes[i].ignore=true;
							processMessage(mutation.addedNodes[i]);
								
						} catch(e){console.log(e);}
					}
				}
			});
		};
		
		var config = { childList: true, subtree: true };
		var MutationObserver = window.MutationObserver || window.WebKitMutationObserver;
		var observer = new MutationObserver(onMutationsObserved);
		observer.observe(target, config);
	}
	
	console.log("Social Stream injected");
	
	var checkReady = setInterval(function(){
		var mainChat = document.querySelector("body> div > div > div > div > div > div > div > div > div > div > div:nth-of-type(4) > div:nth-of-type(2) > div:nth-of-type(2) > div > div");
		if (mainChat){ // just in case 
			console.log("Social Stream Start");
			clearInterval(checkReady);
			
			setTimeout(function(){
				var clear = mainChat.querySelectorAll("div");
				for (var i = 0;i<clear.length;i++){
					clear[i].ignore = true; // don't let already loaded messages to re-load.
				}
				console.log("Social Stream ready to go");
				onElementInserted(mainChat);
			},1500);
		} 
	},500);
	
	///////// the following is a loopback webrtc trick to get chrome to not throttle this twitch tab when not visible.
	try {
		var receiveChannelCallback = function(e){
			remoteConnection.datachannel = event.channel;
			remoteConnection.datachannel.onmessage = function(e){};;
			remoteConnection.datachannel.onopen = function(e){};;
			remoteConnection.datachannel.onclose = function(e){};;
			setInterval(function(){
				if (document.hidden){ // only poke ourselves if tab is hidden, to reduce cpu a tiny bit.
					remoteConnection.datachannel.send("KEEPALIVE")
				}
			}, 800);
		}
		var errorHandle = function(e){}
		var localConnection = new RTCPeerConnection();
		var remoteConnection = new RTCPeerConnection();
		localConnection.onicecandidate = (e) => !e.candidate ||	remoteConnection.addIceCandidate(e.candidate).catch(errorHandle);
		remoteConnection.onicecandidate = (e) => !e.candidate || localConnection.addIceCandidate(e.candidate).catch(errorHandle);
		remoteConnection.ondatachannel = receiveChannelCallback;
		localConnection.sendChannel = localConnection.createDataChannel("sendChannel");
		localConnection.sendChannel.onopen = function(e){localConnection.sendChannel.send("CONNECTED");};
		localConnection.sendChannel.onclose =  function(e){};
		localConnection.sendChannel.onmessage = function(e){};
		localConnection.createOffer()
			.then((offer) => localConnection.setLocalDescription(offer))
			.then(() => remoteConnection.setRemoteDescription(localConnection.localDescription))
			.then(() => remoteConnection.createAnswer())
			.then((answer) => remoteConnection.setLocalDescription(answer))
			.then(() =>	{
				localConnection.setRemoteDescription(remoteConnection.localDescription);
				console.log("KEEP ALIVE TRICk ENABLED");
			})
			.catch(errorHandle);
	} catch(e){
		console.log(e);
	}

})();