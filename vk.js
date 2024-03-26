(function () {
	 
	function toDataURL(url, callback) {
	  var xhr = new XMLHttpRequest();
	  xhr.onload = function() {
		  
		var blob = xhr.response;
    
		if (blob.size > (25 * 1024)) {
		  callback(url); // Image size is larger than 25kb.
		  return;
		}

		var reader = new FileReader();
		
		
		reader.onloadend = function() {
		  callback(reader.result);
		}
		reader.readAsDataURL(xhr.response);
	  };
	  xhr.open('GET', url);
	  xhr.responseType = 'blob';
	  xhr.send();
	}

	function escapeHtml(unsafe){ // when goofs be trying to hack me
		return unsafe
			 .replace(/&/g, "&amp;")
			 .replace(/</g, "&lt;")
			 .replace(/>/g, "&gt;")
			 .replace(/"/g, "&quot;")
			 .replace(/'/g, "&#039;") || "";
	}
	function getAllContentNodes(element) { // takes an element.
		var resp = "";

        if (!element) {return resp;}
		
		if (!element.childNodes || !element.childNodes.length){
			if (element.textContent){
				return escapeHtml(element.textContent) || "";
			} else {
				return "";
			}
		}
		
		element.childNodes.forEach(node=>{
			if (node.childNodes.length){
				resp += getAllContentNodes(node)
			} else if ((node.nodeType === 3) && node.textContent && (node.textContent.trim().length > 0)){
				resp += escapeHtml(node.textContent);
			} else if (node.nodeType === 1){
				if (!settings.textonlymode){
					if ((node.nodeName == "IMG") && node.src){
						node.src = node.src+"";
					}
					resp += node.outerHTML;
				}
			}
		});
		return resp;
	}
	
	
	function processMessage(ele){
		var name = "";
		try {
            if (ele.querySelector('[class^="VideoChat-module__ownerName"]')) {
			    name = escapeHtml(ele.querySelector('[class^="VideoChat-module__ownerName"]').textContent.trim());
            } else {
                name = escapeHtml(ele.querySelector('[class^="VideoChat-module__adminOwnerName-"]').innerHTML.trim()) + ' <img class="emoji" src="https://vk.com/emoji/e/e2ad90.png" alt="⭐">';
            }
        } catch(e){}

		var msg = "";
		try {
			msg = getAllContentNodes(ele.querySelector('[class^="VideoChat-module__messageText"]'));
        } catch(e){}

		var chatimg = "";
		try {
			chatimg = escapeHtml(ele.querySelector('[class^="vkuiImageBase__img"]').src);
        } catch(e){}

        var id = "";
        try {
            id = ele.querySelector('[class^="vkuiLink Link-module__link"]').href.split('/').pop();
        } catch(e){}
		
		
		var data = {};
		data.chatname = name;
		data.chatbadges = "";
		data.backgroundColor = "";
		data.textColor = "";
		// data.nameColor = nameColor;
		data.nameColor = "";
		data.chatmessage = msg;
		// data.chatimg = chatimg;
		data.chatimg = chatimg || "";
		data.hasDonation = "";
		data.membership = "";
		data.contentimg = "";
		data.textonly = settings.textonlymode || false;
		data.type = "";
        
		data.vkid = id;

		
		pushMessage(data);
	}

	function pushMessage(data){
		try{
			chrome.runtime.sendMessage(chrome.runtime.id, { "message": data }, function(e){});
		} catch(e){
		}
	}
	
	var settings = {};
	// settings.textonlymode
	// settings.captureevents
	
	
	chrome.runtime.sendMessage(chrome.runtime.id, { "getSettings": true }, function(response){  // {"state":isExtensionOn,"streamID":channel, "settings":settings}
		if ("settings" in response){
			settings = response.settings;
		}
	});

	chrome.runtime.onMessage.addListener(
		function (request, sender, sendResponse) {
			try{
				if ("focusChat" == request){ // if (prev.querySelector('[id^="message-username-"]')){ //slateTextArea-
					document.querySelector('.mv_chat_reply_input').focus();
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
			} catch(e){}
			sendResponse(false);
		}
	);

	var lastURL =  "";
	var observer = null;
	
	
	function onElementInserted(containerSelector) {
		var target = document.querySelector(containerSelector);
		if (!target){return;}
		
		
		var onMutationsObserved = function(mutations) {
			mutations.forEach(function(mutation) {
				if (mutation.addedNodes.length) {
					
					for (var i = 0, len = mutation.addedNodes.length; i < len; i++) {
						try {
							if (mutation.addedNodes[i].skip){return;}
							mutation.addedNodes[i].skip = true;
							processMessage(mutation.addedNodes[i]); // just for debugging
						} catch(e){}
					}
				}
			});
		};
		
		var config = { childList: true, subtree: true };
		var MutationObserver = window.MutationObserver || window.WebKitMutationObserver;
		
		observer = new MutationObserver(onMutationsObserved);
		observer.observe(target, config);
	}
	
	console.log("social stream injected");

	setInterval(function(){
		try {
        the_root = '[class^="VideoChat-module__in"]'
		if (document.querySelector(the_root)){
			if (!document.querySelector(the_root).marked){
				document.querySelector(the_root).marked=true;
				console.log("CONNECTED chat detected");
				setTimeout(function(){
					document.querySelectorAll('[class^="VideoChat-module__message"]').forEach(ele=>{
                        // if (!ele.skip)
						    ele.skip=true;
						    // processMessage(ele);
					});
					onElementInserted(the_root);
				},1000);
			}
		}} catch(e){}
	},2000);

})();