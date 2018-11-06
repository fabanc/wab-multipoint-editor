define(
	[
    'dojo/_base/declare', 
    'dojo/_base/lang',
    'esri/dijit/Popup',
    "esri/domUtils",
  ],
  function(
    declare, lang, Popup, domUtils
    ) {
    //To create a widget, you need to derive from BaseWidget.
    return declare([Popup], {

        preamble: function() {
          this.originalHide = lang.hitch(this, this.hide);
          this.hide = lang.hitch(this, function(clearSelection) {
            this.hideWidthConfirmDialog(clearSelection);
          });
  
          // disable setScrollable from esriUtils
          if(domUtils.setScrollable) {
            this.originalSetScrollableDomUtils = domUtils.setScrollable;
            domUtils.setScrollable = function(){return [{remove: function() {}}, {remove: function() {}}];};
          }
        },
  
        constructor: function() {
          // restore the setScrollable for esriUtils
          domUtils.setScrollable = this.originalSetScrollableDomUtils;
        },
  
        hideWidthConfirmDialog: function(clearSelection) {
          /*jshint unused: false*/
          this.originalHide();
        }
      });
});