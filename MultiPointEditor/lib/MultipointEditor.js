define(
	[
    'dojo/_base/declare', 
    "dojo/_base/lang",
    "dojo/on",
    "dojo/_base/Color",
    'dojo/i18n!./nls/MultipointEditor',
    "dojo/text!./MultipointEditor.html",
    'dijit/_WidgetBase',
    "dijit/_WidgetsInTemplateMixin",
    "dijit/_TemplatedMixin",
    'dijit/form/Button',
    'dijit/form/Select',
    "esri/toolbars/edit",
    "esri/symbols/SimpleMarkerSymbol",
    "esri/tasks/query",
    './MultipointEditorViewModel'
  ],
  function(
    declare,
    lang, 
    on,
    dojoColor,
    i18n,
    template,
    _WidgetBase,
    _WidgetsInTemplateMixin,
    _TemplatedMixin,
    Button,
    Select,
    Edit,
    SimpleMarkerSymbol,
    Query,
    MultipointEditorViewModel
    ) {

        //To create a widget, you need to derive from BaseWidget.
    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: template,
        viewModel: new MultipointEditorViewModel(),
        map: null,
        highlightSymbol : new SimpleMarkerSymbol().setColor(new dojoColor([255,0,0])),
        layers: [],
        layerClickEvents: [],
        _editableLayersIds: [],
        nls: i18n,

        constructor: function(map){
            this.map = map;
        },

        startup: function() {
            this.inherited(arguments);
            
            this.viewModel.set('map', this.map);
            this.viewModel.set('editToolbar', new Edit(this.map));

            this.setEditControlsDisabled(true);
            //Events happening when updating draw mode.
            this.cbEditMode.on("change", lang.hitch(this, function(evt){
                var modeAsNumber = parseInt(this.cbEditMode.value);
                this.viewModel.set('currentMode', modeAsNumber);
            }));

            this.btnStopEditingFeature.on("click", lang.hitch(this, function(){
                // var editedLayer = this.viewModel.selectedGraphic.getLayer();
                // editedLayer.clearSelection();
                // this.viewModel.set("selectedGraphic", null);
                // this.setEditControlsDisabled(true);
                this.stopEditing();
            }));

            this.btnDeleteFeature.on("click", lang.hitch(this, function(){
                this.viewModel.deleteSelectedGraphic();
            }));
            
        },

        stopEditing: function(){
            if(this.viewModel.selectedGraphic != null){
                var editedLayer = this.viewModel.selectedGraphic.getLayer();
                editedLayer.clearSelection();
                this.viewModel.set("selectedGraphic", null);
                this.setEditControlsDisabled(true);        
            } 
        },
    
        // ---------------------------------------------------------------
        // Layer Click Events Management
        // ---------------------------------------------------------------
        makeLayersSelectable: function(editableLayersIds){
            console.log("Making Layer Clickable");
            this._editableLayersIds = editableLayersIds;
            for (var i=0; i < this._editableLayersIds.length; i++){
                var layerId = this._editableLayersIds[i];
                var featureLayer = this.map.getLayer(layerId);
                this.makeLayerSelectable(featureLayer);
            }
        },

        setEditControlsDisabled: function(disabled){
            //Make sure no graphic and associated even is left behind.
            if(this.viewModel.selectedGraphic != null){
                this.viewModel.set("selectedGraphic", null);
            }

            //Disable control
            this.cbEditMode.setDisabled(disabled);
            this.btnStopEditingFeature.setDisabled(disabled);
            this.btnDeleteFeature.setDisabled(disabled);
        },
    
        makeLayerSelectable(featureLayer){
            console.log("Pushing click event");
            this.layerClickEvents.push(
                on.pausable(featureLayer, "click", lang.hitch(this, function(evt){
                    //console.log("Layer Click ...");
                    featureLayer.setSelectionSymbol(this.highlightSymbol);
                    var query = new Query();
                    query.where = featureLayer.objectIdField	+ "=" + evt.graphic.attributes[featureLayer.objectIdField];
                    featureLayer.selectFeatures(
                        query, 
                        null, 
                        lang.hitch(this, 
                        function(evt){
                            console.log("Numbers of features selected: ", evt.length);
                            this.setEditControlsDisabled(false);
                            this.viewModel.set('selectedGraphic', evt[0]);
                            this.viewModel.setupVertexClick()
                        
                        }),
                        function(err){
                            console.log("Feature Selection Failed ...");
                        })
                }))
            );
        },

        activateLayerClickEvents: function(){
            console.log("Resuming layer click event");
            for(var i=0; i < this.layerClickEvents.length; i++){
              this.layerClickEvents[i].resume();
            }
        },
    
        pauseLayerClickEvents: function(){
            console.log("Pausing layer click event");
            for(var i=0; i < this.layerClickEvents.length; i++){
                this.layerClickEvents[i].pause();
            }
        },

        removeLayerClickEvents: function(){
            console.log("Pausing layer click event");
            for(var i=0; i < this.layerClickEvents.length; i++){
                this.layerClickEvents[i].remove();
            }
            this.layerClickEvents = [];
        }
    });

});