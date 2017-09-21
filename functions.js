
/** Make HTTP Request **/
function ajax( method, url, cb, formData ) {
	if(["POST","GET","PUT","DELETE","PATCH"].indexOf(method.toUpperCase()) < 0){
		formData = cb; cb = url; url = method; method = "GET";
	}
	method = method.toUpperCase()
	
	if( typeof formData == 'undefined' || formData instanceof FormData ) {
		var progressbar = document.querySelector( "progress" ) || {style:{display:""},value:0}
		progressbar.style.display = "block"
		
		var http = new XMLHttpRequest()
		http.onreadystatechange = function() { 
			//progressbar.value =  http.readyState * 25
			
			if ( http.readyState == 4 ){ 
				progressbar.style.display = "none"
				if( http.status == 200 ) {
					try { var j = JSON.parse( http.responseText ); 
						//if( j.error ) alert( "\nERROR\n" + j.error ) 
					} catch ( e ) { var j = http.responseText }
					if( (j && j.errmsg) || (typeof j == "string" && j.length)) alert( j.errmsg ? j.errmsg : j.toString() )
					else if( cb ) cb( j ) 
				} else if( http.status == 401 ) {
					location.reload()
				} else {
					alert( http.statusText || "Server error" )
					if( cb ) cb( [] )
				}
			}		
		}
		try {
			http.open( method, url, true )
			http.send( formData || null )
		} catch ( e ) { alert( e ); throw e }
	} else {
		var msg = "STOP \nTrying to submit NONE FormData to " + url + ""
		console.error( msg ); alert( msg )
	}
}

/** Convert bites in  human readble string **/
function fileSize(b) { b = b?b:0
    var s=1024, u = 0; while (b >= s || -b >= s) { b /= s; u++ }
    return (u ? b.toFixed(1) + ' ' : b) + ' KMGTPEZY'[u] + 'B'
}


/** Add JSON to FormData **/
function appendFormData( formData, jsonData, key ){
	function decodeBASE64( data ){
		try { data = atob(data) } catch(e){}
		return data
	}
    key = key || '';
	if( Array.isArray( jsonData ) )
		for( var i = 0; i < jsonData.length; i++ ) appendFormData( formData, jsonData[i], key ? key + "["+i+"]" : "" )
	else if ( typeof jsonData === 'object' )
		for( var k in jsonData ) appendFormData( formData, jsonData[k], (key ? key+".": "") + k )
    else {
		if(key.toString() == "0") jsonData = decodeBASE64(jsonData)
		formData.append( key, jsonData )
	}
	return formData
}



