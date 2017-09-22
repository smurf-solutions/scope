/** PROGRESS BAR
		usage: progress.start(), progress.stop()	
	**/
document.body.innerHTML += '<progress id="progress" data-counter="0"></progress>'
progress.style.cssText = "position:fixed;top:0;left:0;height:6px;width:100%;"
progress.start = ()=>{ if(++progress.dataset.counter == 1) progress.style.display = "block"}
progress.stop  = ()=>{ if(--progress.dataset.counter == 0) progress.style.display = "none" }


/** TOASTS
	**/
function toast( message ){
	var toast = document.createElement("div")
	toast.setAttribute("class","toast")
	document.body.appendChild( toast )
	toast.innerHTML = message
	setTimeout(function(){ toast.remove() }, 3000)
}


/** DIALOGS
	**/
var dialogComponent = {
	selector: "dialog,[dialog]",
	parse: ($container)=>{
		[].forEach.call( $container.querySelectorAll(dialogComponent.selector), dialogComponent.create)
	},
	create: (el)=>{
			if(!el.id) el.id = "dlg-"+(new Date).getTime()
		
			var closeButton = document.createElement("big")
			closeButton.innerHTML = "&times;"
			closeButton.setAttribute("onclick",'this.dispatchEvent(new Event("hide",{bubbles:true}))')
			closeButton.setAttribute( "style",'position:absolute; right:0px;top:0px; padding:0px 8px;cursor:pointer; font-size:1.8em;text-align:center;font-weight:bold; line-height: 28px; width: 28px; height: 28px; border-radius:3px;')
			closeButton.onmouseover = function(){this.style.background="rgba(0,0,0,0.05)"}
			closeButton.onmouseout = function(){this.style.background="transparent"}
			el.appendChild( closeButton )

			if(!el.onkeyup) el.onkeyup = function(e){
				if (e.keyCode === 27) window[el.id].hide()
			}
		
			el.show = function(data){
				el.style.display="block"
				var autofocus = el.querySelector("[autofocus]"); if(autofocus) autofocus.focus()
				if(data){ var form = el.querySelector("form"); if(form) form.reset() }
				if(typeof data=="object"){
						[].forEach.call(Object.keys(data),(k)=>{
							var f = el.querySelector('[name="'+k+'"]'); if(f) f.value = data[k]
						})
				}
			}
			el.hide = function(){ el.style.display="none"}

			if(!el.hasAttribute("data-onhide")){ 
				el.addEventListener("hide",function(){window[el.id].hide()})
			}
			if(!el.hasAttribute("data-onclose")){
				el.addEventListener("close",function(){window[el.id].hide()})
			}
	}
}


/** FORMS
	**/
var formComponent = {
	selector: "form[method=ajax]",
	parse: ($container)=>{
		[].forEach.call( $container.querySelectorAll(formComponent.selector), formComponent.create)
	},
	create: (element)=>{
		if(!element.id) element.id = "form-"+(new Date).getTime()
		
		element.addEventListener("submit",function(event){
			event.preventDefault(); event.stopPropagation()
			var fData = new FormData(element)
			var http = new XMLHttpRequest
			
			progress.start()
			
			http.open("POST", element.getAttribute("action"))
			http.addEventListener("load",function(){
				var ret = JSON.parse(this.responseText)
				if( ret.error ){
					element.dispatchEvent(new CustomEvent("error",{detail:ret,bubbles:true}))
				} else {
					element.dispatchEvent(new CustomEvent("success",{detail:ret,bubbles:true}))
				}
				progress.stop()
			})
			http.addEventListener("error",alert)
			http.send(fData)
		})
	
		if( !element.getAttribute("data-onshow") ){
			element.addEventListener("show",function(event){
				element.reset()
			})
		}
	}
}


/** SCOPE TEMPLATES
		Properties: data-COMPONENT, [data-temaplate, data-url, data-json, data-on*]
		Variables: $data, $parent, [$i, $row] 
		Service EVENTS: render / data-onrender -> after any element is rendered
		Functions: refresh, reload, setData, show, hide, broadcastEvent
	**/
var scopeTemplate = {
	selector: "[-COMPONENT],[--TEMPLATE--],[__TEMPLATE__]",
	
	// ----- Controllers -----
	
	parseChildren: ($parent)=>{
			dialogComponent.parse($parent)
			formComponent.parse($parent)
			;[].forEach.call( $parent.querySelectorAll(scopeTemplate.selector), (el)=>{
				scopeTemplate.create( el, $parent )
			})
	},
	
	create: (el, $parent)=>{
			el.ready = {
				service: false,
				visible: false,
				template: false,
				data: false,
				rendered: false
			}
			scopeTemplate.initService(el,$parent)
			return scopeTemplate.process(el)
	},
	process: (el)=>{
			progress.start()
			scopeTemplate.initTemplate(el)
			if( scopeTemplate.initIf(el) ){
				scopeTemplate.initData(el)
			}
			progress.stop()
			return el
	},
	reload: (el)=>{  
		return function(){
				this.ready = { 
					visible:false,
					template: true,
					data:false,
					rendered:false,
					events:false
				};
				this.isReloading = true
				return scopeTemplate.process(this)
			}
	},
	setData: (el)=>{
		return function(data){
				if(typeof data == "string"){
					if(this.originalJson) this.dataset.json = this.originalJson
					this.dataset.url = data
				} else if(typeof data == "object"){
					if(this.dataset.url){
						if(this.originalJson) this.dataset.json = this.originalJson
						with(data){
							this.dataset.url = eval('`'+this.originalUrl+'`')
							console.log(this.originalUrl)
						}
					} else {
						this.dataset.json = scopeTemplate.safeStringify(data)
					}
				}
				return this.reload()
		}
	},
	show: (el)=>{
		return function(data){
			this.style.display = "block"
			if(data){ 
				var form = this.querySelector("form"); if(form) form.reset() 
				return this.setData(data)
			} else {
				var af = this.querySelector("[autofocus]"); if(af) af.focus()
				return this
			}
		}
	},
	hide: (el)=>{
		return function(){ this.style.display = "none"; return this }
	},
	broadcastEvent: (el)=>{
		return function(message,details){
			;[].forEach.call(this.querySelectorAll("[data-on"+message+"],[data-on-"+message+"]"), (child)=>{
				child.dispatchEvent(new CustomEvent(message,{details:details}))
			});
			return this
		}
	},
	
	//----- Inits ------
	initService: (el,$parent)=>{
			if(!el.id) el.id = "scope-"+(new Date).getTime()
			
			el.parent  = $parent; 
			el.parents = ($parent.parents||[]); el.parents.push($parent)
			
			el.addedEventListeners = []
			
			el.reload    = scopeTemplate.reload(el)
			el.refresh   = scopeTemplate.reload(el)
			el.show      = scopeTemplate.show(el)
			el.hide      = scopeTemplate.hide(el)
			el.setData   = scopeTemplate.setData(el)
			el.broadcastEvent = scopeTemplate.broadcastEvent(el)
	},
	initIf: (el)=>{
			/*** 
				el.isVisible = data-if
			***/
			if(el.ready.visible) return
			el.ready['visible'] = true
			el.isVisible = true
			
			if(el.dataset.if){
				el.isVisible = scopeTemplate.safeEval(el.dataset.if, el.parent.data||{})
			}
			if(!el.isVisible) { el.innerHTML = el.dataset.else||""
			} else scopeTemplate.render(el)
			
			return el.isVisible
	},
	initTemplate: (el)=>{
			/***
				el.template = data-template, data-template-url, innerHTML
			***/
			if(el.ready['template']) return

			function parseInnerHTML(){
				// sanitize body
				[].forEach.call(el.querySelectorAll(scopeTemplate.selector),(child)=>{
					child.innerHTML = child.innerHTML.replace(/\\\$\{/g,"${").replace(/\$\{/g,"\\${")
				})
				
				// children first level
				function setStyle(){
					var node = document.createElement("style")
					el.templateStyle.replace(/[\n\t]/g," ").split("}").forEach( line => {
						var [k,s] = line.split("{")
						if(k && s) node.innerHTML += scopeTemplate.htmlDecode(`#${el.id.replace(/\//g,"\\/")} ${k}{${s}}\n`)
					})
					document.head.appendChild(node)
				}
				function moveTo(child,prop, isInner){
					el[prop] = isInner ? child.innerHTML : child.outerHTML
					if(isInner) el[prop] = el[prop].replace(/^<[a-z]+>|<\/[a-z]+>$/gi,"")
					el.removeChild( child )
				}
				
				el.templateFirst = el.dataset.first
				el.templateLast = el.dataset.last
				el.templateEmpty = el.dataset.empty 
				el.templateScript = el.dataset.script
				el.templateStyle = el.dataset.style
				
				var children = el.children
				for(var i=children.length-1; i>-1; i--){
					var child = children[i]
					switch( child.getAttribute('role') ){
						case 'empty' : 							    moveTo(child,'templateEmpty');  break;
						case 'head'  : case 'header': case 'first': moveTo(child,'templateFirst');  break;
						case 'foot'  : case 'footer': case 'last' : moveTo(child,'templateLast') ;  break;
						case 'script': moveTo(child,'templateScript',1); break; 
						case 'style' : moveTo(child,'templateStyle',1); setStyle(); break;
					}
					switch( child.nodeName ){
						case 'SCRIPT': 
							if(!document.head.querySelector('script[data-origin="'+el.id+'"]')){
								var s = document.createElement("script");if(child.src)s.src=child.src;s.dataset.origin=el.id;s.innerHTML=child.innerHTML;
								if( el.dataset.templateUrl || el.parents.filter((p)=>p.dataset.templateUrl).length ){
									   document.head.appendChild( s );
								} else document.head.innerHTML += s.outerHTML
							}; el.removeChild(child); break
						case 'STYLE': 
							if(!document.head.querySelector('style[data-origin="'+el.id+'"]')){
								document.head.innerHTML += '<style data-origin="'+el.id+'">'+child.innerHTML+'</style>'
							}
							el.removeChild(child); break;
					}
				}
				
				// default
				el.template = el.innerHTML
				el.innerHTML = ""
				el.ready['template'] = true
			}
			
			if(el.dataset.template){
				if(el.dataset.template.substr(0,1)=="#"){
					el.template = [el.dataset.template.substr(1)].innerHTML
				} else {
					el.dataset.templateUrl = el.dataset.template
				}
			}
			
			if(el.dataset.templateUrl){
				progress.start()				
				var http = new XMLHttpRequest; http.addEventListener("load",function(e){
					el.innerHTML = this.responseText; parseInnerHTML()
					scopeTemplate.render(el)
					progress.stop()
				}); http.open("GET",el.dataset.templateUrl ); http.send()
			}  else {
				parseInnerHTML()
				scopeTemplate.render(el)
			}
	},
	initData: (el)=>{
			/***
				el.data = data-url, data-json
			***/
			if(el.ready.data) return

			if(el.dataset.json){
				el.originalJson = el.dataset.json 
				try{ eval("el.data="+el.dataset.json)
				}catch(e){ console.error("Parsing 'data-json' => ",e.toString(),"\n\n-- data\n",el.dataset.json,"\n\n-- element",el); return }
			} else el.data = {}
			
			if(el.dataset.url){
				progress.start()
				el.originalUrl = el.dataset.url
				el.data = Array.isArray(el.data) ? {} : el.data||{};
				
				let http = new XMLHttpRequest; http.addEventListener("load",function(e){
					try { var ret = JSON.parse(this.responseText)
					}catch(e){console.error("Parsing 'data-url' => ",e.toString(),"\n\n-- data\n",this.responseText,"\n\n-- element",el); return}
					
					if(Array.isArray(ret)) {
						  el.data = ret.map(a=>Object.assign(a,el.data))
					}else el.data = Object.assign( ret, el.data||{} )
					
					progress.stop()
					el.ready['data'] = true
					scopeTemplate.render(el)
				}); http.open("GET",el.dataset.url); http.send()
			} else{
				el.ready['data'] = true
				scopeTemplate.render(el)
			}
	},
	
	// ------- View ------
	
	render: (el)=>{
		if(el.ready.rendered) return
		if(!el.ready.visible || !el.ready.template || !el.ready.data) return
		
		function safeEval($tpl, $data, lastError){
			with($data){
				try{ return eval("`"+ $tpl +"`")
				}catch(e){
					if(e.message !== lastError 
						&& (e.message.substr(-15)==' is not defined' || e.message.substr(-13)==' is undefined')
					){ var $var = e.message.split(" ")[0].replace(/(^\')|(\'$)/g,'')
						return safeEval($tpl,Object.assign($data,{[$var]:""}),e.message)
					}else{console.error("Render template => ",e.toString(),"\n\n-- template\n",$tpl,"\n\n-- data\n",$data,"\n\n-- element",el); return}
		}	}	}
		
		// function safeEval($tpl, $data){
			// return scopeTemplate.safeEval.call(this,"`"+$tpl+"`",$data)
		// }
		
		el.ready.rendered = true

		
		var $data = el.data, $parent = el.parent
		try { eval(scopeTemplate.htmlDecode(el.templateScript)) 
		}catch(e){console.error("Executing script => ",e.toString(),"\n-- script\n",el.templateScript,"\n-- element",el)}
	
		var content = ""
		if(!el.isVisible){
			content += safeEval(el.dataset.else||"", el.data);
		} else {
			if(Array.isArray(el.data)){
				if(el.templateEmpty && el.data.length == 0){
					content += safeEval(el.templateEmpty,{"$parent":el.parent})
				} else {
					if(el.templateFirst){
						content += safeEval(el.templateFirst,{"$data":el.data,"$parent":el.parent})
					}
					[].forEach.call(el.data,($row,$i)=>{
						content += safeEval( el.template,Object.assign($row,{"$i":$i,"$row":$row,"$parent":el.parent}))
					})
					if(el.templateLast){
						content += safeEval(el.templateLast,{"$data":el.data,"$parent":el.parent})
					}
				}
			} else {
				content += safeEval(el.template, Object.assign(el.data,{"$parent":el.parent}));
			}
		}
		el.innerHTML = content
		scopeTemplate.initEvents(el)
		;[].forEach.call(el.querySelectorAll("[data-onrender]"),(child)=>{child.dispatchEvent(new Event("render"))})
		var autofocus = el.querySelector("[autofocus]"); if(autofocus) autofocus.focus()
		scopeTemplate.parseChildren(el)
	},
	
	initEvents: (el)=>{
		// customized events
		function setOnEvents(el, $parent){
			// if already passed with parent scope
			if(!el.ready) el.ready = {}
			if(el.ready.events) return;
			else el.ready.events = true
			
			;[].forEach.call( el.attributes, (a)=>{
				if(a.nodeName.match(/^data-on/i)){
					var $ev = a.nodeName.replace(/^data-on[-]?/i,"")
					
					var id = el.id
					if(el.id){
						if(!window.addedEventListeners ) window.addedEventListeners = {}
						if(!window.addedEventListeners[el.id]) window.addedEventListeners[el.id]=[]
					}
					
					if(!el.id || window.addedEventListeners[el.id].indexOf($ev) == -1){
						if(el.id) window.addedEventListeners[el.id].push($ev)
						el.addEventListener($ev,event=>{
							var $this = el, $data = $parent.data, $functions = $parent.templateScript
							if($functions) {
								$functions = $functions.replace(/\/\*[\s\S]*?\*\//g, "")
								$functions = scopeTemplate.htmlDecode($functions.substr($functions.indexOf("function")))
								try{eval($functions)
								}catch(e){console.error("Error evaluating the parent script: \n",$functions,"\n-- on event\n",$ev,"\n-- parent\n",el.parent,"\n\n-- called from \n",el)}
							}
							try { eval(a.nodeValue.replace(/this/g,"$this") ) 
							}catch(e){console.error("'"+a.nodeName+"' => ",e.toString(),"\n-- element\n",el,"\n-- parent",$parent)}
						})
					}
				}
			})
		}
		
		// first level templates (in index.html)
		if(!el.ready || !el.ready.events){
			setOnEvents(el,el.parent||el)
		}
		
		;[].forEach.call(el.querySelectorAll(scopeTemplate.selector), template=>{
			template.isReloading = true
		})
		;[].forEach.call(el.querySelectorAll("*"), child=>{
			// The refreshing unchains old rendered event listeners !
			if(el.isReloading) window.addedEventListeners[child.id] = []

			setOnEvents(child,el)
		})
	},
	
	// --- Tools
	htmlDecode: (str)=>{
		return !str ? str : str.replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
	},
	safeStringify: (obj)=>{
		var cache = []
		function cyrcularRefRemove(key,value){
			if (typeof value === 'object' && value !== null)
				if (cache.indexOf(value) !== -1) return;
				else cache.push(value);
			return value;
		}
		return JSON.stringify(obj,cyrcularRefRemove)
	},
	safeEval: ($tpl, $data, $$lastError)=>{
			with($data){
				try{ return eval($tpl)
				}catch(e){
					if(e.message !== $$lastError 
						&& (e.message.substr(-15)==' is not defined' || e.message.substr(-13)==' is undefined')
					){ var $var = e.message.split(" ")[0].replace(/(^\')|(\'$)/g,'')
						return scopeTemplate.safeEval($tpl,Object.assign($data,{[$var]:""}),e.message)
					}else{console.error("Render template => ",e.toString(),"\n\n-- template\n",$tpl,"\n\n-- data\n",$data /*,"\n\n-- element",el*/); return}
			}	}	
	}
}

document.body.broadcastEvent = scopeTemplate.broadcastEvent(document.body)
window.broadcastEvent = function(msg,details){document.body.broadcastEvent(msg,details)}
window.addedEventListeners = {}
window.addEventListener("error",(e)=>{e.detail ? alert(e.detail.error.errmsg) : console.error(e)})
window.addEventListener("success",(e)=>{toast("Success")})
scopeTemplate.parseChildren(document.body)
