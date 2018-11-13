# wab-multipoint-editor

## Why another editor?

The out of the box editor provided for Web App Builder by Esri does not support geometry editing on multi-points geometries. This widget provides a solution for that.

## What about editing attributes?

It is not supported yet. This is something that I have in mind, but just did not have the time to implement yet. It is important to me at least when creating new features, as the feature service may require some fields to be populating in order to save a new feature.

If your multi-point feature class does not have required values, this widget will allow you to add the new multi-point features, while the Edit widget will let you edit attributes.

## How to deploy?

In order to use that widget, copy the folder MultiPoint editor in you web app builder folder, under client\stemapp\widgets.

## How to use.

### Edit an existing multi-point geometry.

When MultiPointEditor is open, click on the multipoint layer that needs to be edited. This will select a graphic. Selected graphic will have a specific symbol.

Once the graphic is selected, feature action commands will be enabled. Using the drop down list, it is possible to modify the vertices of a multi-point feature by:
 - Moving vertices 
 - Deleting vertices
-  Adding vertices

The delete button will delete the whole geometry, no just the vertex. In order to stop editing a geometry and work on another feature, you need to click the stop edit button.

### Creating a brand-new multipoint feature.

Click on the feature template on the bottom part of the widget. This will activate the "Create New Feature Mode" and stop the "Edit Existing Feature Mode".