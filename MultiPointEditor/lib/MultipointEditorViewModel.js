define(
	[
    'dojo/_base/declare', 
    "dojo/_base/lang",
    'dojo/Stateful',
    "esri/toolbars/edit"
  ],
  function(
    declare, lang, Stateful,
    Edit
    ) {

        //To create a widget, you need to derive from BaseWidget.
    return declare([Stateful], {

        //Variables used to define the different editing modes
        MOVE: 0,
        ADD_VERTEX: 1,
        REMOVE_VERTEX: 2,

        //Application events
        addEvent: null,
        vertexClickEvent: null,
        vertexMouveEnd: null,

        //Editing toolbar
        editToolbar: null,

        currentMode: this.MOVE,
        _currentModeSetter: function(newMode){
            //If mode are identical, there is nothing to do
            if(newMode === this.currentMode){
                return;
            }

            //Remove old handlers
            if(this.currentMode){
                switch(this.currentMode){
                    case this.ADD_VERTEX:
                        if (this.addEvent != null){
                            this.addEvent.remove();
                        }
                        break;
                    case this.REMOVE_VERTEX:
                    case this.MOVE:
                        if(this.vertexClickEvent != null){
                            this.vertexClickEvent.remove();
                        }

                        if(this.vertexClickEvent != null){
                            this.vertexMouveEnd.remove();
                        }

                        break;
                    default:
                        throw ("Unsupported Edit Mode");
                }
            }

            //Add new handlers
            switch(newMode){

                case this.ADD_VERTEX: 
                    //Add click event handler
                    this.setupAddVertex();
                    break;
                case this.REMOVE_VERTEX:
                case this.MOVE:
                    //Add vertex click event handler
                    this.setupVertexClick(this.selectedGraphic);
                    break;
                default:
                    throw ("Unsupported Edit Mode");

            }
            this.currentMode = newMode;
        },


        selectedGraphic: null,
        //Set the selected graphic
        _selectedGraphicSetter: function(graphic){

            //If the editToolbar has not been initialized yet, do it from the graphic.
            if (this.editToolbar == null && graphic != null){
                this.editToolbar = new Edit(graphic.getLayer().getMap());
            }

            //Remove events associated with previous graphic
            if (this.addEvent){
                this.addEvent.remove();
            }

            this.selectedGraphic = graphic;
            console.log("Set graphic");
        }, 

        setupAddVertex: function(){
            console.log("Setting up add vertex ...");
            this.addEvent = this.map.on("click", lang.hitch(this, function(evt){
                console.log("Pushing point: ", evt.mapPoint);
                this.selectedGraphic.geometry.points.push(
                    [evt.mapPoint.x, evt.mapPoint.y]
                );
                this.selectedGraphic.getLayer().applyEdits(null, null, null);
            }))
        },

        setupVertexClick: function(){

            //Make sure a graphic is currently selected
            if(this.selectedGraphic == null){
                console.warn("The editor does not have a graphic currently selected.");
                return;
            }

            this.editToolbar.activate(Edit.EDIT_VERTICES, this.selectedGraphic)
            this.vertexClickEvent = this.editToolbar.on("vertex-click", lang.hitch(this,function(evt){
                var graphic = this.selectedGraphic;
                var vertexInfo = evt.vertexinfo;
                if (this.currentMode === this.REMOVE_VERTEX){
                    console.log("Need to pop a point and save at: ", vertexInfo.pointIndex);
                    if(graphic.geometry.points.length === 1){
                        console.warn("Unsupported operation: attempting to remove the last point of a multipoint geometry");
                        return;
                    }
                    var newPoints = [];
                    for(var i=0; i < graphic.geometry.points.length; i++){
                        if(i !== vertexInfo.pointIndex){
                            newPoints.push(graphic.geometry.points[i]);
                        }
                    }
                    graphic.geometry.points = newPoints;
                    graphic.getLayer().applyEdits(
                        null, 
                        [graphic], 
                        null, 
                        function(){
                            console.log("Feature Added!");
                        },
                        function(err){
                            console.log("Failed to add feature: ", err);
                        }
                    );  
                }
            }));

            if (this.currentMode === this.MOVE){
                this.vertexMouveEnd = this.editToolbar.on("vertex-move-stop", lang.hitch(this, function(evt){
                    var graphic = evt.graphic;
                    var featureLayer = graphic.getLayer();
                    featureLayer.applyEdits(null, [graphic], null);
                }));
            }
        },
    });
});