// ==UserScript==
// @name        Village Sign Series Stats
// @namespace   http://www.cryotest.com/
// @description Adds your Village Sign Series stats badge onto your profile page and Village Sign Series cache pages on geocaching.com.
// @license     GPL version 3 or any later version; http://www.gnu.org/copyleft/gpl.html
// @copyright   2019, Cryo99
// @attribution Village Sign Series stats provided by Chris AKA Bus.Stop (http://www.villagesignseries.co.uk/)
// @attribution Icon image extracted from the Village Sign Series banner by Chris AKA Bus.Stop
// @icon        https://raw.githubusercontent.com/Cryo99/VillageSignStats/master/icon48.png
// @icon64      https://raw.githubusercontent.com/Cryo99/VillageSignStats/master/icon64.png
// @include     /^https?://www\.geocaching\.com/(account|my|default|geocache|profile|seek/cache_details|p)/
// @exclude     /^https?://www\.geocaching\.com/(login|about|articles|myfriends|account/*)/
// @version     0.0.1
// @supportURL	https://github.com/Cryo99/VillageSignStats
// @require     https://openuserjs.org/src/libs/sizzle/GM_config.js
// @grant       GM_xmlhttpRequest
// @grant       GM_registerMenuCommand
// @grant       GM_setValue
// @grant       GM_getValue
// ==/UserScript==


(function (){
	"use strict";
	var cacheName = document.getElementById("ctl00_ContentBody_CacheName"),
		vssCSS = document.createElement("style"),
		// VSS images can be wider when level names are long. overflow: hidden; on vss-container prevents images from overlaying the div border.
		css = 'div.vss-container { border: 1px solid #b0b0b0; margin-top: 1.5em; padding: 0; text-align: center; overflow: hidden;} .WidgetBody div.vss-container { border: none; } #ctl00_ContentBody_ProfilePanel1_pnlProfile div.vss-container { border: none; text-align: inherit;} a.vss-badge { background-color: white;} #ctl00_ContentBody_ProfilePanel1_pnlProfile div.vss-container {float: left}',
		currentPage,
		profileNameOld = document.getElementById("ctl00_ContentBody_ProfilePanel1_lblMemberName"),
		profileName = document.getElementById("ctl00_ProfileHead_ProfileHeader_lblMemberName"),
		userFieldOld = document.getElementsByClassName("li-user-info"),
		userField = document.getElementsByClassName("user-name"),
		userName = "",
		userNames = [],
		stats = [];

	function displayStats(stats, page, brand){
		function getHtml(uname, brand){
			return "<a class='vss-badge' href='https://www.villagesignseries.co.uk' title='Village Sign Series stats.'><img src='https://img.villagesignseries.co.uk/awards/find-badge.php?name=" + uname + "&brand=" + brand + "' /></a>";
		}
		var vssWidget = document.createElement("div"),
			html = "",
			i,
			target;

		for(i = 0; i < stats.length; i++){
			var name = (stats[i].name + "")
				.replace(/;/g, ",")
				.replace(/'/g, "&apos;")
				.replace(/"/g, "&quot;");
			if(i === 0 || stats[i].name !== stats[0].name){
				html += getHtml(name, brand);
			}
		}

		switch(page){
			case "my":
				target = document.getElementById("ctl00_ContentBody_lnkProfile");
				break;
			case "account":
                target = document.getElementsByClassName('sidebar-right')[0];
				break;
			case "cache":
                target = document.getElementsByClassName('sidebar')[0];
                break;
			case "profile":
				if(profileName){
					target = document.getElementById("ctl00_ContentBody_ProfilePanel1_lblProfile");
					if (target) {
						target = target.parentNode;
					}
				}else if(profileNameOld){
					target = document.getElementById("HiddenProfileContent");
				}
				break;
		}

		if(!target){
			console.warn("Village Sign Series: Aborted - couldn't find where to insert widget. You might not be logged in.");
			return;
		}

		if(html){
			vssWidget.className = "vss-container";
			vssWidget.innerHTML = html;
            switch(page){
                case "my":
                case "profile":
                    target.parentNode.insertBefore(vssWidget, target.nextSibling);
                    break;
                default:
                    target.insertBefore(vssWidget, target.firstChild.nextSibling.nextSibling);
                    break;
            }
        }else{
			console.warn("Village Sign Series Stats: didn't generate an award badge.");
		}
	}
	function getHiderName(){
		var i,
			links = document.getElementsByTagName("a"),
			pos;
		if(links){
			for(i = 0; i < links.length; i++){
				pos = links[i].href.indexOf("/seek/nearest.aspx?u=");
				if(pos !== -1){
					return decodeURIComponent(links[i].href.substr(pos + 21).replace(/\+/g, '%20'));
				}
			}
		}
	}

	function parseNames(names){
		// Filter out null or undefined entries, convert commas to semicolons, then convert to a comma-separated string.
		return encodeURIComponent(names
				.filter(function (n){
					return n !== undefined;
				})
				.map(function (n){
					return (n + "").replace(/,/g, ";");
				})
				.join());
	}


	//// EXECUTION STARTS HERE

	// Don't run on frames or iframes
	if(window.top !== window.self){
		return false;
	}

	if(/\/my\//.test(location.pathname)){
		// On a My Profile page
		currentPage = "my";
    }else if(/\/account\//.test(location.pathname)){
		// On a Profile page
		currentPage = "account";
	}else{
		if(cacheName){
			// On a Geocache page...
			if(!/VS #/i.test(cacheName.innerHTML)){
				// ...but not an Village Sign Series cache
				return;
			}
			currentPage = "cache";
		}else{
			currentPage = "profile";
		}
	}

	// We're going to display so we can announce ourselves and prepare the dialogue.
	console.info("Village Sign Series Stats V" + GM_info.script.version);

    //******* Configuration dialogue *******
	// Register the menu item.
	GM_registerMenuCommand("Options", function(){
		GM_config.open();
	}, 'S');

	GM_config.init({
		'id': 'vss_config', // The id used for this instance of GM_config
		'title': 'Village Sign Series Stats', // Panel Title
		'fields': { // Fields object
			'vss_branding': { // This is the id of the field
				'label': 'Branding', // Appears next to field
				'type': 'select', // Makes this setting a dropdown
				'options': ['Awards', 'Levels', 'None'], // Possible choices
				'default': 'Levels' // Default value if user doesn't change it
			}
		},
		// Dialogue internal styles.
		'css': '#vss_config {position: static !important; width: 75% !important; margin: 1.5em auto !important; border: 10 !important;} #vss_config_vss_branding_var {padding-top: 30px;}',
		'events': {
			'open': function(document, window, frame){
				// iframe styles.
				frame.style.width = '300px';
				frame.style.height = '250px';
				frame.style.left = parent.document.body.clientWidth / 2 - 150 + 'px';
				frame.style.borderWidth = '5px';
				frame.style.borderStyle = 'ridge';
				frame.style.borderColor = '#999999';
			},
			'save': function(){
				GM_setValue('vss_branding', GM_config.get('vss_branding'));
				location.reload();                              // reload the page when configuration was changed
			}
		}
	});

	var brand = GM_getValue('vss_branding', 'Levels');
	console.info("Village Sign Series Stats branding: " + brand);
	brand = brand.toLowerCase()
    //**************************************

    var hider;
	switch(currentPage){
		case "profile":
			if(profileName){
				userNames = [profileName.textContent.trim()];
			}else if(profileNameOld){
				userNames = [profileNameOld.textContent.trim()];
			}
			break;
		default:
			if(userField.length > 0){
				userNames.push(userField[0].innerHTML.trim());
			}
			hider = getHiderName();
			if(typeof hider !== 'undefined'){
				userNames.push(hider);
			}
			break;
	}

	for(var i = 0; i < userNames.length; i++){
		stats[i] = {name: userNames[i]};
	}

	userName = parseNames(userNames);
	if(!userName){
		console.error("Village Sign Series Stats: Aborted - couldn't work out user name");
		return;
	}

	// Inject widget styling
	vssCSS.type = 'text/css';
	if(vssCSS.styleSheet){
		vssCSS.styleSheet.cssText = css;
	}else{
		vssCSS.appendChild(document.createTextNode(css));
	}
	document.head.appendChild(vssCSS);
	displayStats(stats, currentPage, brand);
}());
