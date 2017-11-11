/*** v.1 ***/

/* /string/.highlight(search) - wraps with <span> the founded string */
String.prototype.highlight = function(search){
	if(!this || this.length < 1 ) return '';
	if(search.length < 1) return this;
	return this.replace(new RegExp('('+search.replace(/\ /g,"|")+')',"img"),'<span style="background:yellow;color:#000">$1</span>')
}

/* filter( elem, filter ) - hides first level none matched children */
function filter(idWrapElement,filter){
	let els = document.getElementById(idWrapElement).querySelectorAll("#"+idWrapElement+" > *")
	for (i = 0; i < els.length; i++ )
		els[i].style.display = els[i].textContent.toUpperCase().indexOf(filter.toUpperCase()) > -1 ? "" : "none"
}
