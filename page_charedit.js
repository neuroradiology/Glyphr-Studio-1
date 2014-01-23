


//-------------------
// UBER FUCNTIONS
//-------------------

	function updatecharedit(){
		document.getElementById("mainpane").innerHTML = charedit_content();
			
		setupEditCanvas();
		setupGhostCanvas();
		
		initEventHandlers();
		
		_UI.selectedtool = "pathedit";
		
		redraw();	
	}
	
	function charedit_content(){
		var re = '<canvas id="chareditcanvas" width=12 height=12 ></canvas>';		
		re += '<div id="toolsarea"> [ERROR: Uninitialized content] </div>';
		return re;
	}
		
	function updateselectchar(fname){
		var ccon = "<div class='charselectarea'>"
		fname = fname? fname : "selectchar";
		_UI.selectchardrawarr = [];
		
		//Capitol Letters
		for(var i=65; i<91; i++){ccon += buildbutton(i, fname);}
		ccon += "<div style='display:block; clear:all;'></div>";
		
		//Lowercase Letters
		for(var i=97; i<123; i++){ccon += buildbutton(i, fname);}
		ccon += "<div style='display:block; clear:all;'></div>";
				
		// Symbols		
		for(var i=33; i<48; i++){ccon += buildbutton(i, fname);}
		for(var i=58; i<65; i++){ccon += buildbutton(i, fname);}
		for(var i=91; i<97; i++){ccon += buildbutton(i, fname);}
		for(var i=123; i<127; i++){ccon += buildbutton(i, fname);}
		ccon += "<div style='display:block; clear:all;'></div>";
		
		// Space
		ccon += buildbutton(32, fname);
		ccon += "</div>";
		
		//debug("UPDATESELECTCHAR - _UI.selectchardrawarr.length = " + _UI.selectchardrawarr.length);
		return ccon;
	}	

	function drawselectcharthumbs(){		
		var ps = _GP.projectsettings;
		var factor = ((_UI.thumbsize-(2*_UI.thumbgutter))/(ps.upm));
		var yoffset = (_UI.thumbgutter+(ps.ascent*factor));
		
		//debug("drawselectcharthumbs - _UI.selectchardrawarr: " + _UI.selectchardrawarr);
		
		for(var sc=0; sc<_UI.selectchardrawarr.length; sc++){
			var tc = _UI.selectchardrawarr[sc];
			//debug("---------------------- i: " + sc + " id: " + tc);
			var scan = document.getElementById("cs"+tc);
			scan.width = _UI.thumbsize;
			scan.height = _UI.thumbsize;
			var sctx = scan.getContext("2d");
		
			_GP.fontchars[tc].drawCharToArea(sctx, factor, _UI.thumbgutter, yoffset);
		}
	}
	
	function buildbutton(index, fname){
		var onc = (fname + "(" + index + ");");
		var rv = "<div class='charselectbuttonwrapper' onclick='"+onc+"' title='"+_GP.fontchars[index].charname+"'>";
		var issel = _GP.fontchars[index].charvalue == _GP.fontchars[_UI.selectedchar].charvalue;
		issel = issel & (_UI.navhere != "linked shapes");
		
		if(_GP.fontchars[index].charshapes[0]){
			var extra = "";
			if(issel) {extra = " charselectcanvassel";} 
			rv += "<canvas id='cs"+index+"' class='charselectcanvas"+extra+"'></canvas>";
			_UI.selectchardrawarr.push(index);
		} else {	
			if(issel) {rv += "<div class='charselectbuttonsel'";} 
			else {rv += "<div class='charselectbutton'";}

			if(index == 32) rv += " style='font-size:13px; padding-top:15px;'";	// SPACE needs to be smaller font size

			rv += ">";

			var bv = _GP.fontchars[index].charvalue;
			if(bv == "'") bv = "&#39";
			
			rv += (bv+"</div>");
		}
		
		rv += "</div>";

		return rv;
	}
	
	function selectchar(c, dontnavigate){
		//debug("SELECTCHAR - Selecting " + _GP.fontchars[c].charvalue + " from value " + c);
		_UI.selectedchar = c;
		_UI.shapelayers = _GP.fontchars[c].charshapes;
		_UI.selectedshape = -1;

		//debug("SELECTCHAR: shapelayers is now " + JSON.stringify(_UI.shapelayers));
		if(!dontnavigate){
			//debug("SELECTCHAR: selecting " + _GP.fontchars[c].charvalue + " and navigating.");
			navigate();
		}
	}

	function setupGhostCanvas(){
		//Is Here Ghost Canvas - same size as CEC
		_UI.ishereghostcanvas = document.getElementById('ishereghostcanvas');
		_UI.ishereghostcanvas.height = _UI.chareditcanvassize;
		_UI.ishereghostcanvas.width = _UI.chareditcanvassize;
		_UI.ishereghostctx = _UI.ishereghostcanvas.getContext('2d');
		_UI.ishereghostctx.fillStyle = "cyan";
		_UI.ishereghostctx.globalAlpha = .5;
		_UI.ishereghostcanvas.style.backgroundColor = "transparent";
	}

	function setupEditCanvas(){
		_UI.chareditcanvas = document.getElementById("chareditcanvas");
		_UI.chareditcanvas.height = _UI.chareditcanvassize;
		_UI.chareditcanvas.width = _UI.chareditcanvassize;
		_UI.chareditctx = _UI.chareditcanvas.getContext("2d");
		_UI.chareditcanvas.onselectstart = function () { return false; };		//for Chrome, disable text select while dragging
		_UI.chareditcanvas.onmouseout = mouseoutcec;
		_UI.chareditcanvas.onmouseover = mouseovercec;	
	}
	
	function resetCursor() { document.body.style.cursor = 'default'; }
		
	function resetZoomPan(){ _UI.viewport = clone(_UI.defaultviewport); }


//-------------------
// REDRAW
//-------------------
	function redraw(){
		if(_UI.navhere == "linked shapes") {linkedshapesredraw(); return;}		
		
		var fc = _GP.fontchars;
		
		_UI.chareditctx.clearRect(0,0,_UI.chareditcanvassize,_UI.chareditcanvassize);
		grid();
		
		// load char info
		_UI.shapelayers = fc[_UI.selectedchar].charshapes;
		//debug("!!! REDRAW !!! - _UI.selectedchar: " + _UI.selectedchar + " - numshapes: " + _UI.shapelayers.length + " - navhere: " + navhere);	
		var sh;
		

		// Recompute Right Hand Line
		// Only update charwidth if isautowide is true
		if(fc[_UI.selectedchar].isautowide) {
			fc[_UI.selectedchar].charwidth = 0;
			for(var jj=0; jj<_UI.shapelayers.length; jj++) {
				sh = _UI.shapelayers[jj];
				var thisrightx = 0;
				if(sh.link){
					var tss = _GP.linkedshapes[sh.link].shape;
					if(sh.uselinkedshapexy) {
						thisrightx = tss.path.rightx;
					} else {
						thisrightx = (tss.path.rightx + sh.xpos);
					}
				} else {
					thisrightx = sh.path.rightx;
				}
				fc[_UI.selectedchar].charwidth = Math.max(fc[_UI.selectedchar].charwidth, thisrightx);
			}
		}
		//show right hand line
		if(_UI.showguides && _UI.showrightline){
			_UI.chareditctx.lineWidth = 1;
			//_UI.chareditctx.strokeStyle = shiftColor(_GP.projectsettings.color_guideline, .5, true);
			_UI.chareditctx.strokeStyle = _GP.projectsettings.color_guideline;
			var rhl = (fc[_UI.selectedchar].charwidth*_UI.viewport.zoom) + _UI.viewport.originx;
			if(_UI.eventhandlers.temppathdragshape){
				rhl = Math.max(sx_cx(_UI.eventhandlers.temppathdragshape.rightx), rhl);
			}
			vertical(rhl);
		}


		// Draw all the char shapes
		_UI.chareditctx.beginPath();
		
		for(var jj=0; jj<_UI.shapelayers.length; jj++) {
			sh = _UI.shapelayers[jj];
			
			if(_UI.eventhandlers.temppathdragshape){
				if(jj!==_UI.selectedshape){
					sh.drawShape_Stack(_UI.chareditctx);
				}
			} else {
				sh.drawShape_Stack(_UI.chareditctx);
			}
		}

		_UI.chareditctx.fillStyle = _GP.projectsettings.color_glyphfill;
		_UI.chareditctx.fill("nonzero");
		//debug("REDRAW - done drawing, charwidth is: " + fc[_UI.selectedchar].charwidth);


		// Finish up
		var s = ss("Redraw");
		if(s) {
			s.drawSelectOutline(s.link != false);				
			if(s.link){
				_UI.selectedtool = "shaperesize";
			}
		}
		
		updateNavPrimaryNavTarget();
		
		updatetools();

	}

	
//-------------------
// Update Details
//-------------------
	function updateCharEditDetails(){

		var s = ss("update details");
		
		var ispointsel = false;
		if(s && !s.link) ispointsel = s.path.sp(false);
		if(_UI.selectedtool != "pathedit") ispointsel = false;
		
		var content = "";
		if(_UI.navhere == "linked shapes"){
			content = "<h1>" + _GP.linkedshapes[_UI.shownlinkedshape].shape.name + "</h1>";
		} else {
			content = "<h1>attributes</h1>";
		}
		
		_UI.locarr = [];
		_UI.checkarr = [];

		content += "<table class='detail'>";	
		
		//debug("UPDATEDETAILS - _UI.selectedshape: " + _UI.selectedshape + " - s.name: " + s.name + " - navhere: " + _UI.navhere);
		if (_UI.navhere == "character edit"){
			//debug("UPDATEDETAILS - detected navhere = character edit");
			if(s && s.link){
				// linked shape selected
				//debug("UPDATEDETAILS: linked shape selected");
				content += linkedShapeInstanceDetails(s);
			} else if (s){
				// regular shape selected
				//debug("UPDATEDETAILS: regular shape selected");
				content += shapeDetails(s);
				if(ispointsel){ content += pointDetails(s); }
			} else {
				// no shape selected
				//debug("UPDATEDETAILS: no shape selected");
				content += charDetails();	
			}

			content += "</table><br>";
			content += updateactions();

		} else if (_UI.navhere == "linked shapes"){
			//debug("UPDATEDETAILS - detected navhere = linked shapes");
			if (s){
				content += shapeDetails(s);
				if(ispointsel){ 
					content += pointDetails(s); 
				}
			}
			content += linkedShapeCharDetails();
			content += "</table><br>";
			content += updatelinkedshapeactions();
		}
		
		try {
			document.getElementById("navtargetpane").innerHTML = content;	
		} catch(err) {
			debug("UPDATEDETAILS - innerHTML update error caught");
		}
		
		ispointsel? drawPointButtons(s) : false;

	   	// draw UsedInThumbs for LinkedShapes
	   	if(_UI.navhere == "linked shapes"){
	   		drawUsedinThumbs();
	   	}

		// draw locks
		//debug("UPDATEDETAILS - starting drawing locks, locarr.length = " + _UI.locarr.length);
		for(var j=0; j<_UI.locarr.length; j++){
			var thislocid = ("locid"+j);
			var obj = document.getElementById(thislocid);
			//debug("UPDATEDETAILS - drawing lock id " + thislocid + " obj = " + obj);
			if(obj){
				obj.height = 11;
				obj.width = 11;
				var color = _UI.locarr[j]? _UI.colors.button_selected : _UI.colors.button_resting;
				drawLockButton(obj, color);
			}
		}
		_UI.locid = 0;
		
		
		//draw checks
		for(var k=0; k<_UI.checkarr.length; k++){
			var thischeckid = ("checkid"+k);
			var obj = document.getElementById(thischeckid);
			if(obj){
				//debug("Drawing Check with ID: " + thischeckid + ", obj: " + obj + " passed: " + _UI.checkarr[k]);
				obj.height = 15;
				obj.width=15;
				drawCheckbox(obj, _UI.checkarr[k]);			
			}
		}
		_UI.checkid = 0;
	}
	
	function charDetails(s){
		var sc = _GP.fontchars[_UI.selectedchar];
		var content = "";	
		
		content += "<tr><td colspan=3><h3>character "+sc.charvalue+"</h3></td></tr>";	
		content += "<tr><td class='leftcol'>&nbsp;</td><td style='margin-top:0px; padding-top:0px;'> auto width </td><td width='50%'>"+checkUI("_GP.fontchars[_UI.selectedchar].isautowide="+!sc.isautowide+"; redraw();", sc.isautowide)+"</td></tr>";

		if(!sc.isautowide){
			content += "<tr><td class='leftcol'>&nbsp;</td><td> width <span class='unit'>(em units)</span> </td><td><input class='input' type='text' value='" + sc.charwidth + "' onchange='_GP.fontchars[_UI.selectedchar].charwidth = (this.value*1); redraw();'>"+spinner()+"</td></tr>";
		} else {
			content += "<tr><td class='leftcol'>&nbsp;</td><td> width <span class='unit'>(em units)</span> </td><td> " + rounddec(sc.charwidth) + " </td></tr>";
		}		
		
		content += "<tr><td class='leftcol'>&nbsp;</td><td> width <span class='unit'>(em %)</span> </td><td> " + rounddec(sc.charwidth/_GP.projectsettings.upm) + " </td></tr>";
		
		content += "<tr><td colspan=3>&nbsp;</td></tr>";

		content += "<tr><td class='leftcol'>&nbsp;</td><td style='margin-top:0px; padding-top:0px;'> use default left side bearing </td><td width='50%'>"+checkUI("_GP.fontchars[_UI.selectedchar].leftsidebearing="+!sc.leftsidebearing+"; redraw();", !sc.leftsidebearing)+"</td></tr>";
		if(sc.leftsidebearing){
			if(sc.leftsidebearing === true) sc.leftsidebearing = _GP.projectsettings.defaultlsb;
			content += "<tr><td class='leftcol'>&nbsp;</td><td> custom<br>left side bearing <span class='unit'>(em units)</span> </td><td><input class='input' type='text' value='" + sc.leftsidebearing + "' onchange='_GP.fontchars[_UI.selectedchar].leftsidebearing = (this.value*1); redraw();'>"+spinner()+"</td></tr>";
		} else {
			content += "<tr><td class='leftcol'>&nbsp;</td><td> default<br>left side bearing <span class='unit'>(em units)</span> </td><td> " + rounddec(_GP.projectsettings.defaultlsb) + " </td></tr>";
		}

		content += "<tr><td colspan=3>&nbsp;</td></tr>";

		content += "<tr><td class='leftcol'>&nbsp;</td><td> number of shapes </td><td> " + _UI.shapelayers.length + " </td></tr>";

		return content;

	}
	
	function shapeDetails(s){
		//debug("SHAPEDETAILS - <b>Drawing Shape Details</b>");
		var content = "";
		content += "<tr><td colspan=2><h3>shape</h3></td><td style='width:200px'>&nbsp;</td></tr>\n";		
		
		content += "<tr><td class='leftcol'>&nbsp;</td><td style='margin-top:0px; padding-top:0px;'> name </td><td style='margin-top:0px; padding-top:0px; padding-right:10px;'><input class='input' style='width:90%;' type='text' value='" + s.name + "' onchange='ss().changeShapeName(this.value);'></td></tr>\n";
		
		
		if(!_UI.eventhandlers.temppathdragshape){
			content += "<tr><td class='leftcol'>"+lockUI("ss().xlock",s.xlock)+"</td><td> x </td><td><input class='input' type='text' " + (s.xlock? "disabled='disabled'" : "onchange='ss().path.updatePathPosition((this.value-("+s.path.leftx+")),0); redraw();'") + " value='" + s.path.leftx + "' >" + (s.xlock? "" : spinner()) + "</td></tr>\n";
			content += "<tr><td class='leftcol'>"+lockUI("ss().ylock",s.ylock)+"</td><td> y </td><td><input class='input' type='text' " + (s.ylock? "disabled='disabled'" : "onchange='ss().path.updatePathPosition(0,(this.value-("+s.path.topy+"))); redraw();'") + " value='" + s.path.topy + "' >" + (s.ylock? "" : spinner()) + "</td></tr>\n";			
			
			var cw = (s.path.rightx-s.path.leftx);
			content += "<tr><td class='leftcol'>"+lockUI("ss().wlock",s.wlock)+"</td><td> width </td><td><input class='input' type='text' " + (s.wlock? "disabled='disabled'" : "onchange='ss().path.updatePathSize((this.value-"+cw+"),0); redraw();'") + " value='" + cw + "' >" + (s.wlock? "" : spinner()) + "</td></tr>\n";
			var ch = (s.path.topy-s.path.bottomy);
			content += "<tr><td class='leftcol'>"+lockUI("ss().hlock",s.hlock)+"</td><td> height </td><td><input class='input' type='text' " + (s.hlock? "disabled='disabled'" : "onchange='ss().path.updatePathSize(0,(this.value-"+ch+")); ss().path.updatePathPosition(0,((this.value-"+ch+")*-1)); redraw();'") + " value='" + ch + "' >" + (s.hlock? "" : spinner()) + "</td></tr>\n";
			
		
		} else {
			content += "<tr><td class='leftcol'>"+lockUI("ss().xlock",s.xlock)+"</td><td> x </td><td><input class='input' type='text' value='" + _UI.eventhandlers.temppathdragshape.leftx + "'>&nbsp;</td></tr>\n";
			content += "<tr><td class='leftcol'>"+lockUI("ss().ylock",s.ylock)+"</td><td> y </td><td><input class='input' type='text' value='" + _UI.eventhandlers.temppathdragshape.topy + "'>&nbsp;</td></tr>\n";
			
			content += "<tr><td class='leftcol'>"+lockUI("ss().wlock",s.wlock)+"</td><td> width </td><td><input class='input' type='text' value='" + Math.round(_UI.eventhandlers.temppathdragshape.rightx-_UI.eventhandlers.temppathdragshape.leftx) + "'>&nbsp;</td></tr>\n";
			content += "<tr><td class='leftcol'>"+lockUI("ss().hlock",s.hlock)+"</td><td> height </td><td><input class='input' type='text' value='" + Math.round(_UI.eventhandlers.temppathdragshape.topy-_UI.eventhandlers.temppathdragshape.bottomy) + "'>&nbsp;</td></tr>\n";
		}
		
		content += "<tr><td class='leftcol'>&nbsp;</td><td> direction </td><td><input type='text' disabled='disabled' value='"+(s.path.clockwise==0?"unknown":(s.path.clockwise>0?"counterclockwise":"clockwise"))+"'/><input type='button' onclick='ss().path.reversePath();putundoq(\"reverse path\");redraw();' value='"+(s.path.clockwise>0?"&#8635":"&#8634")+";' class='button spinnerbutton' style='width:40px;'/></td></tr>\n";
		
		//debug("<b>SHAPE DETAILS OUTPUT:<b><br><textarea rows=9 cols=3000>" + content + "</textarea>");
		return content;
	}
	
	function pointDetails(s){
		var tp = s.path.sp();
		var content = "";
		content += "<tr><td colspan=3><h3>path point</h3></td></tr>";	

		content += "<tr><td class='leftcol'>&nbsp;</td><td> selected point </td><td><input class='input' type='text' value='" + s.path.sp(true) + "' onchange='ss().path.selectPathPoint(this.value); redraw();'></td></tr>";
		
		content += "<tr><td class='leftcol'>&nbsp;</td><td> point type </td><td>  ";
		content += "<canvas class='canvasbutton' title='point type: corner' onclick='ss().path.sp().type = \"corner\"; putundoq(\"joint corner\"); redraw();' id='pointcornercanvas'></canvas>";
		content += "<canvas class='canvasbutton' title='point type: flat' onclick='ss().path.sp().type = \"flat\"; putundoq(\"joint flat\"); redraw();' id='pointflatcanvas'></canvas>";
		content += "<canvas class='canvasbutton' title='point type: symmetric' onclick='ss().path.sp().type = \"symmetric\"; putundoq(\"joint symmetric\"); redraw();' id='pointsymmetriccanvas'></canvas>";
		content += "</td></tr>";
		
		content += "<tr><td class='leftcol'>"+lockUI("ss().path.sp().P.xlock",tp.P.xlock)+"</td><td> point x </td><td><input class='input' type='text' " + (tp.P.xlock? "disabled='disabled'" : "onchange='ss().path.sp().setPointPosition(\"P\", Math.round(this.value), \"null\"); putundoq(\"point x\"); redraw();'") + " value='" + tp.P.x + "' >" + (tp.P.xlock? "" : spinner()) + "</td></tr>";
		content += "<tr><td class='leftcol'>"+lockUI("ss().path.sp().P.ylock",tp.P.ylock)+"</td><td> point y </td><td><input class='input' type='text' " + (tp.P.ylock? "disabled='disabled'" : "onchange='ss().path.sp().setPointPosition(\"P\", \"null\", Math.round(this.value)); putundoq(\"point y\"); redraw();'") + " value='" + tp.P.y + "' >" + (tp.P.ylock? "" : spinner()) + "</td></tr>";
		
		content += "<tr><td colspan=3><h3>handle1</h3></td></tr>";
		content += "<tr><td class='leftcol'>&nbsp;</td><td> use handle1 </td><td>"+checkUI("ss().path.sp().useh1="+!tp.useh1+"; putundoq(\"Use H1\"); ss().path.calcMaxes(); redraw();", tp.useh1)+"</td></tr>";
		if(tp.useh1){
			content += "<tr><td class='leftcol'>"+lockUI("ss().path.sp().H1.xlock",tp.H1.xlock)+"</td><td> handle1 x </td><td><input class='input' type='text' " + (tp.H1.xlock? "disabled='disabled'" : "onchange='ss().path.sp().setPointPosition(\"H1\", Math.round(this.value), \"null\"); putundoq(\"h1 x\"); redraw();'") + " value='" + tp.H1.x + "' >" + (tp.H1.xlock? "" : spinner()) + "</td></tr>";
			content += "<tr><td class='leftcol'>"+lockUI("ss().path.sp().H1.ylock",tp.H1.ylock)+"</td><td> handle1 y </td><td><input class='input' type='text' " + (tp.H1.ylock? "disabled='disabled'" : "onchange='ss().path.sp().setPointPosition(\"H1\", \"null\", Math.round(this.value)); putundoq(\"h1 y\"); redraw();'") + " value='" + tp.H1.y + "' >" + (tp.H1.ylock? "" : spinner()) + "</td></tr>";
		}
		
		content += "<tr><td colspan=3><h3>handle2</h3></td></tr>";
		content += "<tr><td class='leftcol'>&nbsp;</td><td> use handle2 </td><td>"+checkUI("ss().path.sp().useh2="+!tp.useh2+"; putundoq(\"Use H2\"); ss().path.calcMaxes(); redraw();", tp.useh2)+"</td></tr>";
		if(tp.useh2){
			content += "<tr><td class='leftcol'>"+lockUI("ss().path.sp().H2.xlock",tp.H2.xlock)+"</td><td> handle2 x </td><td><input class='input' type='text' " + (tp.H2.xlock? "disabled='disabled'" : "onchange='ss().path.sp().setPointPosition(\"H2\", Math.round(this.value), \"null\"); putundoq(\"h2 x\"); redraw();'") + " value='" + tp.H2.x + "' >" + (tp.H2.xlock? "" : spinner()) + "</td></tr>";
			content += "<tr><td class='leftcol'>"+lockUI("ss().path.sp().H2.ylock",tp.H2.ylock)+"</td><td> handle2 y </td><td><input class='input' type='text' " + (tp.H2.ylock? "disabled='disabled'" : "onchange='ss().path.sp().setPointPosition(\"H2\", \"null\", Math.round(this.value)); putundoq(\"h2 y\"); redraw();'") + " value='" + tp.H2.y + "' >" + (tp.H2.ylock? "" : spinner()) + "</td></tr>";
		}
		
		return content;
	}
	
	function drawPointButtons(s){
		//debug("DRAWPOINTBUTTONS");
		var tp = s.path.sp();
		var tempctx;
		var tempcanvas;
		var color;
		
		tempcanvas = document.getElementById("pointcornercanvas");
		tempcanvas.height = 15;
		tempcanvas.width = 15;
		tempcanvas.style.backgroundColor = "transparent";		
		tempctx = tempcanvas.getContext("2d");
		color = (tp.type=='corner'? _UI.colors.button_selected : _UI.colors.button_resting);
		drawPointCornerButton(tempctx, color);
		
		tempcanvas = document.getElementById("pointflatcanvas");
		tempcanvas.height = 15;
		tempcanvas.width = 15;
		tempcanvas.style.backgroundColor = "transparent";		
		tempctx = tempcanvas.getContext("2d");
		color = (tp.type=='flat'? _UI.colors.button_selected : _UI.colors.button_resting);
		drawPointFlatButton(tempctx, color);
		
		tempcanvas = document.getElementById("pointsymmetriccanvas");
		tempcanvas.height = 15;
		tempcanvas.width = 15;
		tempcanvas.style.backgroundColor = "transparent";		
		tempctx = tempcanvas.getContext("2d");
		color = (tp.type=='symmetric'? _UI.colors.button_selected : _UI.colors.button_resting);
		drawPointSymmetricButton(tempctx, color);
	}
	
	// Helper Functions
	function lockUI(varname, islocked){
		//debug("LOCKUI - making html for varname " + varname + " was passed " + islocked + ", and locarr is now: [" + _UI.locarr + "]");
		var re = "<canvas id='locid"+_UI.locid+"' ";
		_UI.locarr[_UI.locid] = islocked;
		_UI.locid = ((_UI.locid*1)+1);
		//re += " onclick='debug(\"--CLICKED ON " + varname + " LOCK-- changing to \"+"+!islocked+"); "+varname+" = " + !islocked + "; redraw();'></canvas>";	
		re += " onclick='"+varname+" = " + !islocked + "; redraw();'></canvas>";	
				
		return re;		
	}
	
	function checkUI(onclick, ischecked){
		//debug("CHECKUI - making html for checkarr[" + _UI.checkid + "] = " + ischecked + ", and checkarr is now: [" + _UI.checkarr + "]");
		var re = "<canvas id='checkid"+_UI.checkid+"' ";
		_UI.checkarr[_UI.checkid] = ischecked;	
		_UI.checkid = ((_UI.checkid*1)+1);
		re += " onclick='"+onclick+"'></canvas>";	
		return re;	
	}
	
	function rounddec(num){
		num = (num? num : 0);
		var numsplit = num.toString().split(".");
		if(numsplit.length == 1){
			return numsplit;
		} else {
			return "" + numsplit[0] + "." + numsplit[1].substr(0,3);
		}
	}
	

//-------------------
// Update Actions
//-------------------
	function updateactions(){
		var content = "<h1>actions</h1><table class='actionsgrid'><tr>";
				
		var s = ss("Update Actions");		
		
		var allactions = "<td><h3>*</h3>";
			allactions += "<input  class='"+(_UI.charundoq.length>0? "button": "buttondis")+"' type='button' value='Undo" + ((_UI.charundoq.length > 0) ? (" " + _UI.charundoq.length) : "") + "' onclick='pullundoq()'><br>";
			allactions += "<input class='button' type='button' value='add new shape' onclick='addShape();putundoq(\"add shape\");redraw();'><br>";
			allactions += "<input class='button' type='button' value='insert linked shape' onclick='insertLinkedShapeDialog();'><br>";
			allactions += "<input class='"+(_UI.clipboardshape? "button": "buttondis")+"' type='button' value='Paste' onclick='pasteShape();putundoq(\"paste shape\");redraw();'><br>";
			
			allactions += "</td>";
			
		var shapeactions = "<td><h3>shape</h3>";
			shapeactions += "<input class='"+(s? "button": "buttondis")+"' type='button' value='Copy' onclick='copyShape()'><br>";
			shapeactions += "<input class='"+(s? "button": "buttondis")+"' type='button' value='Flip Horizontal' onclick='ss().path.flipEW();putundoq(\"flip shape horizontal\");redraw();'><br>";
			shapeactions += "<input class='"+(s? "button": "buttondis")+"' type='button' value='Flip Vertical' onclick='ss().path.flipNS();putundoq(\"flip shape vertical\");redraw();'><br>";
			shapeactions += "<input class='"+(s? "button": "buttondis")+"' type='button' value='Delete' onclick='deleteShape();putundoq(\"delete shape\");redraw();'><br>";

			shapeactions += "</td>";
			
		var layeractions = "<td><h3>layer</h3>";
			layeractions += "<input class='"+(s? "button": "buttondis")+"' type='button' value='Move Up' onclick='moveupShape();putundoq(\"move up shape\");'><br>";
			layeractions += "<input class='"+(s? "button": "buttondis")+"' type='button' value='Move Down' onclick='movedownShape();putundoq(\"move down shape\");'><br>";
			layeractions += "</td>";
			
		var canvasactions = "<td><h3>editor view</h3>";
			canvasactions += "<input class='button' type='button' value='Toggle Grid' onclick='_UI.showgrid? _UI.showgrid=false : _UI.showgrid=true; redraw();'><br>"; 
			canvasactions += "<input class='button' type='button' value='Toggle Guides' onclick='_UI.showguides? _UI.showguides=false : _UI.showguides=true; redraw();'><br>"; 
			canvasactions += "</td>";
			
		var pointactions = "<td><h3>path point</h3>";
			pointactions += "<input class='button' type='button' value='Insert' onclick='ss().path.insertPathPoint(); putundoq(\"insert PP\"); redraw();'><br>";
			pointactions += "<input class='"+(s? "button": "buttondis")+"' type='button' value='Delete' onclick='ss().path.deletePathPoint(); putundoq(\"delete pp\"); redraw();'><br>";
			pointactions += "<input class='button' type='button' value='Reset Handles' onclick='ss().path.sp().resetHandles(); putundoq(\"reset pp\"); redraw();'><br>";	
			pointactions += "</td>";
		
		// Put it all together

		content += allactions;
		
		if(_UI.shapelayers.length > 0){ content += shapeactions; }
		else { content += "<td> &nbsp; </td>";}
		
		var ispointsel = false;
		if(s && !s.link) ispointsel = s.path.sp(false);
		if(_UI.selectedtool != "pathedit") ispointsel = false;
		
		//debug("UPDATEACTIONS - trying to get selected point, ispointsel = " + ispointsel);
		if(ispointsel){ content += pointactions; }
		else { content += "<td> &nbsp; </td>";}
		
		content += "</tr><tr>";
		
		content += canvasactions;
		
		if(_UI.shapelayers.length > 1){ content += layeractions; }
		
		content += "</td></tr></table><br><br>";
		
		return content;
	}

	function updateLayerActions(){
		var content = "<h1>actions</h1><table class='actionsgrid'><tr>";
				
		var s = ss("Update Actions");
		var allactions = "<td><h3>shape</h3>";
			allactions += "<input class='button' type='button' value='add new shape' onclick='addShape();putundoq(\"add shape\");redraw();'><br>";
			allactions += "<input class='button' type='button' value='insert linked shape' onclick='insertLinkedShapeDialog();'><br>";
			
		var shapeactions = "<input class='"+(s? "button": "buttondis")+"' type='button' value='Delete' onclick='deleteShape();putundoq(\"delete shape\");redraw();'><br>";
			
		var layeractions = "<td><h3>layer</h3>";
			layeractions += "<input class='"+(s? "button": "buttondis")+"' type='button' value='Move Up' onclick='moveupShape();putundoq(\"move up shape\");'><br>";
			layeractions += "<input class='"+(s? "button": "buttondis")+"' type='button' value='Move Down' onclick='movedownShape();putundoq(\"move down shape\");'><br>";
			layeractions += "</td>";
			
		content += allactions;
		
		if(_UI.shapelayers.length > 0){ content += shapeactions; }
		content += "</td>";
			
		if(_UI.shapelayers.length > 1){ content += layeractions; }
		
		content += "<td> &nbsp; </td></tr></table>";
		
		return content;
	}

//-------------------
// Copy Paste
//-------------------
	function copyShape(){
		var s = ss("copy shape")
		if(s){
			_UI.clipboardshape = {
				"s":s,
				"c":_UI.selectedchar
			};
			//debug("COPYShape() - new clipboard shape: " + _UI.clipboardshape.s.name); 
		}
		redraw();
	}
	
	function pasteShape(){
		if(_UI.clipboardshape){
			var newshape = clone(_UI.clipboardshape.s);
			_UI.clipboardshape.c == _UI.selectedchar ? newshape.path.updatePathPosition(20,20) : true;
			
			var newname = newshape.name;
			var newsuffix = " (copy)";
			var n = newshape.name.lastIndexOf("(copy");
						
			if(n > 0){
				var suffix = newname.substring(n+5);
				newname = newname.substring(0,n);
				if(suffix == ")"){
					newsuffix = "(copy 2)";
				} else {
					//debug("PASTESHAPE - suffix " + suffix);
					suffix = suffix.substring(1);
					//debug("PASTESHAPE - suffix " + suffix);
					suffix = suffix.substring(0, suffix.length-1);
					//debug("PASTESHAPE - suffix " + suffix);
					newsuffix = "(copy " + (parseInt(suffix)+1) + ")";
					//debug("PASTESHAPE - newsuffix " + newsuffix);
				}			
			}
			newshape.name = newname + newsuffix;
			
			if(newshape.link){
				addToUsedIn(newshape.link, _UI.selectedchar);
				//debug("PASTESHAPE - pasted a linkedshape, added " + _UI.selectedchar + " to usedin array.");
			}

			addShape(newshape);
		}
	}


//-------------------
// Move up / down
//-------------------
	function moveupShape(){
		var s = ss("Move Up Shape");
		
		if(s && (_UI.selectedshape < (_UI.shapelayers.length-1))){
			var tempshape = _UI.shapelayers[_UI.selectedshape+1];
			_UI.shapelayers[_UI.selectedshape+1] = _UI.shapelayers[_UI.selectedshape];
			_UI.shapelayers[_UI.selectedshape] = tempshape;
			_UI.selectedshape++;
			redraw();
		}
	}
	
	function movedownShape(){
		var s = ss("Move Down Shape");
		
		if(s && (_UI.selectedshape > 0)){
			var tempshape = _UI.shapelayers[_UI.selectedshape-1];
			_UI.shapelayers[_UI.selectedshape-1] = _UI.shapelayers[_UI.selectedshape];
			_UI.shapelayers[_UI.selectedshape] = tempshape;
			_UI.selectedshape--;
			redraw();
		}
	}
	
	
//-------------------
// Generic Spinner Control
//-------------------
	function spinner(){
		var content ="";
		content += "<input type='button' value='&#9652;' class='button spinnerbutton' onclick='inc(this);'>";  //&and;
		content += "<input type='button' value='&#9662;' class='button spinnerbutton' onclick='dec(this);'>";  //&or;
		return content;
	}
	
	function inc(obj){
		if(obj.parentNode.childNodes[0]){
			if(isNaN(obj.parentNode.childNodes[0].value)) obj.parentNode.childNodes[0].value = 0;
			obj.parentNode.childNodes[0].value = ((obj.parentNode.childNodes[0].value*1) + _GP.projectsettings.spinnervaluechange);
			obj.parentNode.childNodes[0].onchange();
			putundoq("Up Spinner");
		}
	}
	
	function dec(obj){
		if(obj.parentNode.childNodes[0]){
			if(isNaN(obj.parentNode.childNodes[0].value)) obj.parentNode.childNodes[0].value = 0;
			obj.parentNode.childNodes[0].value = ((obj.parentNode.childNodes[0].value*1) - _GP.projectsettings.spinnervaluechange);
			obj.parentNode.childNodes[0].onchange();
			putundoq("Down Spinner");
		}
	}
	
	
//-------------------
// Update Layers
//-------------------
	function updatelayers(){
		
		var content = "<h1>shapes</h1>";
		content += "<div style='height:7px; display:block;'></div>";

		if(_UI.shapelayers.length > 0){
			content += "<table class='layertable'>"
			for(var i=(_UI.shapelayers.length-1); i>=0; i--){
				if(i==_UI.selectedshape){
					content += "<tr class='layersel'";
				} else {
					content += "<tr class='layer'";
				}
				content += " onclick='_UI.selectedshape = " + i + "; redraw();'>";
				
				content += "<td class='layerthumb'><canvas id='layerthumb"+i+"' height='"+_UI.thumbsize+"' width='"+_UI.thumbsize+"'></canvas></td>";
				
				content += "<td class='layername'>" + _UI.shapelayers[i].name ;
				if(_UI.shapelayers[i].link) { content += "<span class='layernote'>[linked shape]</span>"; }
				content += "</td></tr>";
			}
			content += "</table>";
		} else {
			content += "<div style='margin-left:10px; font-style:oblique;'>No shapes exist yet.<br><br></div>";
		}
		
		if(_UI.clipboardshape){
			content += "<br>Clipboard: " + _UI.clipboardshape.s.name;
		}
		
		content += updateLayerActions();
		
		try {
			//debug("UPDATELAYERS: final html content: \n " + content);
			document.getElementById("navtargetpane").innerHTML = content;	
		} catch(err) {
			//debug("UPDATELAYERS - <b>innerHTML update error caught</b>");
		}

		
		// Update the thumbs		
		if(_UI.shapelayers.length > 0){
			var ps = _GP.projectsettings;
			var tctx = {};
			var tele = false;
			var factor = ((_UI.thumbsize-(2*_UI.thumbgutter))/(ps.upm));
			var yoffset = (_UI.thumbgutter+(ps.upm*factor));
			for(var i=(_UI.shapelayers.length-1); i>=0; i--){
				tele = document.getElementById(("layerthumb"+i))
				tctx = tele.getContext("2d");
				tele.style.backgroundColor = _UI.colors.offwhite;
				if(i == _UI.selectedshape) tele.style.backgroundColor = "rgb(255,255,255)";

				//debug("UPDATELAYERS: layer: " + i + " \t viewport: " + JSON.stringify(_UI.viewport));
				
				/*
				//only draw the thumbs if it's not a temppathdragshape
				if(_UI.eventhandlers.temppathdragshape){
					if(i!==_UI.selectedshape){
						_UI.shapelayers[i].drawShapeToArea(tctx, factor, _UI.thumbgutter, yoffset);
					}
				} else {
					_UI.shapelayers[i].drawShapeToArea(tctx, factor, _UI.thumbgutter, yoffset);
				}
				*/			
				_UI.shapelayers[i].drawShapeToArea(tctx, factor, _UI.thumbgutter, yoffset);
			}
		}
	}


//-------------------
// Update Tools
//-------------------
	function updatetools(){
		var pointselectclass = "";
		var pointselectclickable = true;
		var s = ss("Charedit: UpdateTools");
		if(_UI.navhere == "linked shapes") {
			if(!_GP.linkedshapes[_UI.selectedshape]) { s = false; }
		}
		
		if(_UI.selectedtool=='pathedit'){
			pointselectclass = "buttonsel tool";
		} else if (s.link){
			pointselectclass = "buttondis tool";
			pointselectclickable = false;
		} else {
			pointselectclass = "button tool";
		}
			
		var content = "";
		content += "<div title='edit path' class='" + pointselectclass + "' " + (pointselectclickable? "onclick='clicktool(\"pathedit\");'":"") + "/><canvas id='patheditbuttoncanvas'></canvas></div>";
		content += "<div title='move & resize shape' class='" + (_UI.selectedtool=='shaperesize'? "buttonsel " : "button ") + "tool' onclick='clicktool(\"shaperesize\");'/><canvas id='shaperesizebuttoncanvas'></canvas></div>";
		
		if(_UI.navhere == "character edit"){
			content += "<div class='tool' style='width:10px;'>&nbsp;</div>";
			content += "<div title='new rectangle shape' class='" + (_UI.selectedtool=='newrect'? "buttonsel " : "button ") + "tool' onclick='clicktool(\"newrect\");'/><canvas id='newrectbuttoncanvas'></canvas></div>";
			content += "<div title='new oval shape' class='" + (_UI.selectedtool=='newoval'? "buttonsel " : "button ") + "tool' onclick='clicktool(\"newoval\");'/><canvas id='newovalbuttoncanvas'></canvas></div>";
			content += "<div title='new path shape' class='" + (_UI.selectedtool=='newpath'? "buttonsel " : "button ") + "tool' onclick='clicktool(\"newpath\");'/><canvas id='newpathbuttoncanvas'></canvas></div>";
		}
		
		content += "<div class='tool' style='width:10px;'>&nbsp;</div>";
		content += "<div title='scroll and pan' class='" + (_UI.selectedtool=='pan'? "buttonsel " : "button ") + "tool' onclick='clicktool(\"pan\");'/><canvas id='panbuttoncanvas'></canvas></div>";
		content += "<div title='zoom: in' class='button tool' onclick='canvasZoom(1.1);'><canvas id='zoominbuttoncanvas'></canvas></div>";
		content += "<div title='zoom: out' class='button tool' onclick='canvasZoom(.9);'><canvas id='zoomoutbuttoncanvas'></canvas></div>";
		content += "<div title='zoom: one to one' class='button tool' onclick='_UI.viewport.zoom = 1;redraw();'><canvas id='zoom1to1buttoncanvas'></canvas></div>";
		content += "<div title='zoom: full em' class='button tool' onclick='resetZoomPan(); redraw();'><canvas id='zoomembuttoncanvas'></canvas></div>";
		content += "<div title='zoom level' class='tool out'>" + round(_UI.viewport.zoom*100, 2) + "%</div>";
		
		try {
			document.getElementById("toolsarea").innerHTML = content;	
		} catch(err) {
			debug("UPDATETOOLS - innerHTML update error caught");
		}
		
		// Draw the buttons
		var tempctx;
		var tempcanvas;
		var bh = 19;
		var bw = 16;

		// Path Edit
		tempcanvas = document.getElementById("patheditbuttoncanvas");
		tempcanvas.height = bh;
		tempcanvas.width = bw;
		tempcanvas.style.backgroundColor = "transparent";		
		tempctx = tempcanvas.getContext("2d");
		if(_UI.selectedtool == "pathedit"){ drawPathEditButton(tempctx, "white", "black"); }
		else if (!pointselectclickable) { drawPathEditButton(tempctx, "rgb(80,80,80)", "rgb(80,80,80)"); }
		else { drawPathEditButton(tempctx, "transparent", _UI.colors.accent); }
		
		// Shape Resize
		tempcanvas = document.getElementById("shaperesizebuttoncanvas");
		tempcanvas.height = bh;
		tempcanvas.width = bw;
		tempcanvas.style.margin = "3px 3px 0px 3px";
		tempcanvas.style.backgroundColor = "transparent";		
		tempctx = tempcanvas.getContext("2d");
		if(_UI.selectedtool == "shaperesize"){ drawShapeResizeButton(tempctx, "white", "black"); }
		else { drawShapeResizeButton(tempctx, "transparent", _UI.colors.accent); }

		// Pan
		tempcanvas = document.getElementById("panbuttoncanvas");
		tempcanvas.height = bh;
		tempcanvas.width = bw;
		tempcanvas.style.margin = "3px 4px 0px 2px";
		tempcanvas.style.backgroundColor = "transparent";		
		tempctx = tempcanvas.getContext("2d");
		if(_UI.selectedtool == "pan"){ drawPanButton(tempctx, "white", "black"); }
		else { drawPanButton(tempctx, _UI.colors.accent, "transparent"); }
		
		// Zoom In
		tempcanvas = document.getElementById("zoominbuttoncanvas");
		tempcanvas.height = bh;
		tempcanvas.width = bw;
		tempcanvas.style.margin = "2px 4px 0px 2px";
		tempcanvas.style.backgroundColor = "transparent";		
		tempctx = tempcanvas.getContext("2d");
		drawZoomInButton(tempctx, _UI.colors.accent, "transparent");

		// Zoom Out
		tempcanvas = document.getElementById("zoomoutbuttoncanvas");
		tempcanvas.height = bh;
		tempcanvas.width = bw;
		tempcanvas.style.margin = "2px 4px 0px 2px";
		tempcanvas.style.backgroundColor = "transparent";		
		tempctx = tempcanvas.getContext("2d");
		drawZoomOutButton(tempctx, _UI.colors.accent, "transparent");
		
		// Zoom 1:1
		tempcanvas = document.getElementById("zoom1to1buttoncanvas");
		tempcanvas.height = bh;
		tempcanvas.width = bw;
		tempcanvas.style.margin = "2px 4px 0px 2px";
		tempcanvas.style.backgroundColor = "transparent";		
		tempctx = tempcanvas.getContext("2d");
		drawZoom1to1Button(tempctx, _UI.colors.accent, "transparent");
		
		// Zoom Em
		tempcanvas = document.getElementById("zoomembuttoncanvas");
		tempcanvas.height = bh;
		tempcanvas.width = bw;
		tempcanvas.style.margin = "4px 4px 0px 3px";
		tempcanvas.style.backgroundColor = "transparent";		
		tempctx = tempcanvas.getContext("2d");
		drawZoomEmButton(tempctx, _UI.colors.accent, "transparent");		

		if(_UI.navhere == "character edit"){
			// New Rectangle
			tempcanvas = document.getElementById("newrectbuttoncanvas");
			tempcanvas.height = bh;
			tempcanvas.width = bw;
			tempcanvas.style.margin = "2px 4px 0px 4px";
			tempcanvas.style.backgroundColor = "transparent";		
			tempctx = tempcanvas.getContext("2d");
			if(_UI.selectedtool == "newrect") { drawNewRectButton(tempctx, "white", "black"); }
			else { drawNewRectButton(tempctx, "transparent", _UI.colors.accent); }
			
			// New Oval
			tempcanvas = document.getElementById("newovalbuttoncanvas");
			tempcanvas.height = bh;
			tempcanvas.width = bw;
			tempcanvas.style.margin = "2px 4px 0px 4px";
			tempcanvas.style.backgroundColor = "transparent";		
			tempctx = tempcanvas.getContext("2d");
			if(_UI.selectedtool == "newoval"){ drawNewOvalButton(tempctx, "white", "black"); }
			else { drawNewOvalButton(tempctx, "transparent", _UI.colors.accent); }
			
			// New Path
			tempcanvas = document.getElementById("newpathbuttoncanvas");
			tempcanvas.height = bh;
			tempcanvas.width = bw;
			tempcanvas.style.margin = "2px 4px 0px 4px";
			tempcanvas.style.backgroundColor = "transparent";		
			tempctx = tempcanvas.getContext("2d");
			if(_UI.selectedtool == "newpath"){ drawNewPathButton(tempctx, "white", "black"); }
			else { drawNewPathButton(tempctx, "transparent", _UI.colors.accent); }
		}
	}

	function clicktool(ctool){
		
		_UI.selectedtool = ctool;
		var s = ss("clicktool");
		
		//debug("CLICKTOOL - was passed: " + ctool + " and _UI.selectedtool now is: " + _UI.selectedtool);
		_UI.eventhandlers.eh_addpath.firstpoint = true; 
		if((ctool=="newrect")||(ctool=="newoval")){
			_UI.showrightline = true;
			_UI.selectedshape = -1; 
		} else if (ctool=="newpath"){
			_UI.showrightline = false;
			_UI.selectedshape = -1; 
		} else if(ctool=="pathedit"){
			_UI.showrightline = false;
			if(s) {s.path.selectPathPoint(0);}
			//debug("CLICKTOOL() - setting selectPathPoint = 0");
		} else if (ctool = "shapemove"){
			_UI.showrightline = true;
			if(s){s.path.calcMaxes();}
		}
		
		redraw();
	}

	function canvasZoom(zfactor){
		_UI.viewport.zoom*=zfactor;
		redraw();
	}
	
	
//-------------------
// Drawing Grid
//-------------------

	
	function grid(){
		var ps = _GP.projectsettings;
		var vp = _UI.viewport;

		//debug("GRID: vp:" + JSON.stringify(vp));

		_UI.chareditctx.fillStyle = _UI.colors.offwhite;
		_UI.chareditctx.fillRect(0,0,99999,99999);
		
		var zupm = (ps.upm * vp.zoom);
		var gutter = ((_UI.chareditcanvassize*vp.zoom) - zupm)/2;
		var zasc = (ps.ascent * vp.zoom);
		// background white square

		var xs = {};
		/*
		xs.xmax = Math.round(vp.originx + zupm + gutter);
		xs.xmin = Math.round(vp.originx - gutter);
		xs.ymax = Math.round(vp.originy + (zupm - zasc) + gutter);
		xs.ymin = Math.round(vp.originy - zasc - gutter);
		*/

		xs.xmax = _UI.chareditcanvassize;
		xs.xmin = 0;
		xs.ymax = _UI.chareditcanvassize;
		xs.ymin = 0;
		//debug("GRID: zupm:" + zupm + " gutter:" + gutter + " zasc:" + zasc + " xs:" + JSON.stringify(xs));

		_UI.chareditctx.fillStyle = "white";
		_UI.chareditctx.fillRect(xs.xmin, xs.ymin, xs.xmax-xs.xmin, xs.ymax-xs.ymin);
		
		// Grids		
		var mline = vp.originy - (ps.ascent*vp.zoom);
		var xline = vp.originy - (ps.xheight*vp.zoom);
		var dline = vp.originy - ((ps.ascent - ps.upm)*vp.zoom);
		var overshootsize = (ps.overshoot*vp.zoom);
		var lgline = dline + overshootsize + (ps.linegap*vp.zoom);

		//debug("GRID:\nascent / xheight / descent = "+ ps.ascent+ "/" + ps.xheight+ "/" + (ps.ascent-ps.upm));

		if(_UI.showgrid || _UI.showguides){
			var size = vp.size/ps.griddivisions;
			_UI.chareditctx.lineWidth = 1;
			_UI.chareditctx.strokeStyle = _GP.projectsettings.color_grid;
			
			if(_UI.showgrid){
				var gsize = ((ps.upm/ps.griddivisions)*vp.zoom);
				//debug("GRID - gridsize set as: " + gsize);
				
				for(var j=vp.originx; j<xs.xmax-1; j+=gsize){ vertical(j, xs.ymin, xs.ymax); }
				vertical(xs.xmax+1, xs.ymin, xs.ymax);
				for(var j=vp.originx; j>=xs.xmin; j-=gsize){ vertical(j, xs.ymin, xs.ymax); }
				
				for(var j=vp.originy; j<xs.ymax-1; j+=gsize){ horizontal(j, xs.xmin, xs.xmax); }
				horizontal(xs.ymax, xs.xmin, xs.xmax+1);
				for(var j=vp.originy; j>=xs.ymin; j-=gsize){ horizontal(j, xs.xmin, xs.xmax); }

			}
			
			if(_UI.showguides){
				// Minor Guidelines - Overshoots
				_UI.chareditctx.strokeStyle = shiftColor(_GP.projectsettings.color_guideline, .8, true);
				horizontal(xline-overshootsize, xs.xmin, xs.xmax);
				horizontal(mline-overshootsize, xs.xmin, xs.xmax);
				horizontal(vp.originy+overshootsize, xs.xmin, xs.xmax);
				horizontal(dline+overshootsize, xs.xmin, xs.xmax);
				
				// Right hand Em Square and Line Gap
				vertical(vp.originx+(ps.upm*vp.zoom), xs.ymin, xs.ymax);
				horizontal(lgline, xs.xmin, xs.xmax);
				
				// major guidelines - xheight, top (emzize)
				_UI.chareditctx.strokeStyle = shiftColor(_GP.projectsettings.color_guideline, .5, true);
				horizontal(xline, xs.xmin, xs.xmax);
				//_UI.chareditctx.strokeStyle = shiftColor(_GP.projectsettings.color_guideline, .2, true);
				horizontal(mline, xs.xmin, xs.xmax);
				horizontal(dline, xs.xmin, xs.xmax);
				
				
				// Out of bounds triangle
				_UI.chareditctx.fillStyle = _GP.projectsettings.color_guideline;		
				_UI.chareditctx.beginPath();
				_UI.chareditctx.moveTo(vp.originx, vp.originy);
				_UI.chareditctx.lineTo(vp.originx, vp.originy+(_GP.projectsettings.pointsize*2));
				_UI.chareditctx.lineTo(vp.originx-(_GP.projectsettings.pointsize*2), vp.originy);
				_UI.chareditctx.closePath();
				_UI.chareditctx.fill();
				
				// Origin Lines
				_UI.chareditctx.strokeStyle = _GP.projectsettings.color_guideline;
				horizontal(vp.originy, xs.xmin, xs.xmax);
				vertical(vp.originx, xs.ymin, xs.ymax);
			}
		}
	}
	
	function horizontal(y, xmin, xmax){
		y = Math.round(y)-.5;
		_UI.chareditctx.beginPath();
		_UI.chareditctx.moveTo(xmin,y);
		_UI.chareditctx.lineTo(xmax,y);
		_UI.chareditctx.stroke();
		_UI.chareditctx.closePath();
	}
	
	function vertical(x, ymin, ymax){
		x = Math.round(x)-.5;
		_UI.chareditctx.beginPath();
		_UI.chareditctx.moveTo(x,ymin);
		_UI.chareditctx.lineTo(x,ymax+1);		
		_UI.chareditctx.stroke();
		_UI.chareditctx.closePath();
	}