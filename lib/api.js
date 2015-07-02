var com = {}

com.draft = {

  debugLog: function(msg) {
    if(this.debug) log(msg)
  },

  alert: function (msg, title) {
    title = title || "Draft for Sketch"
    var app = [NSApplication sharedApplication]
    [app displayDialog:msg withTitle:title]
  },
  
  escapedFileName: function(string) {
    var notAllowedChars = [NSCharacterSet characterSetWithCharactersInString:@"\\<>=,!#$&'()*+/:;=?@[]%"]
    var cleanString = [[string componentsSeparatedByCharactersInSet:notAllowedChars] componentsJoinedByString:@""]
    var URLEncoded = encodeURIComponent(cleanString)
    return URLEncoded
  },
  
  copy_layer_with_factor: function(original_slice, factor){
    var copy = [original_slice duplicate]
    var frame = [copy frame]
    
    var rect = [MSSliceTrimming trimmedRectForSlice:copy],
    slice = [MSExportRequest requestWithRect:rect scale:factor]
    
    [copy removeFromParent]
    return slice
  },
  
  showCreateProjectWindow: function(){
    
    // Check if plugin is compatible
    
    if(!this.isCompatible()){
      return false
    }
    
    // Check for artboards
    
    var artboards = [[doc currentPage] artboards]
    
    if(![artboards count]){
      this.alert("Please do some work first!", "No artboards found")
      return false
    }
    
    
    // Declarations
    
    var self = this;
    
    
    // Create window
    
    var createProjectWindow = [[NSWindow alloc] init]
    [createProjectWindow setFrame:NSMakeRect(0, 0, 290, 155) display:false]
    [createProjectWindow setBackgroundColor:NSColor.whiteColor()]
    
    
    // Create prompt text
    
    var titleField = [[NSTextField alloc] initWithFrame:NSMakeRect(25, 95, 243, 17)]
    [titleField setEditable:false]
    [titleField setBordered:false]
    [titleField setDrawsBackground:false]
    [titleField setFont:[NSFont boldSystemFontOfSize:13]]
    [titleField setStringValue:"Give your draft a nice name"]
    [[createProjectWindow contentView] addSubview:titleField]
    
    
    // Create textfields
    
    var projectNameInputField = [[NSTextField alloc] initWithFrame:NSMakeRect(25, 63, 190, 22)]
    [[projectNameInputField cell] setPlaceholderString:"Draft name"]
    [projectNameInputField setFocusRingType:NSFocusRingTypeNone]
    [[createProjectWindow contentView] addSubview:projectNameInputField] 
    
    var pluralNounPopup = [[NSComboBox alloc] initWithFrame:NSMakeRect(220, 60, 50, 26)]
    var pluralNouns  = ["1x", "1.5x", "2x", "0.5x", "3x"]
    [pluralNounPopup removeAllItems]
    [pluralNounPopup setFocusRingType:NSFocusRingTypeNone]
    [pluralNounPopup addItemsWithObjectValues:pluralNouns]
    [[createProjectWindow contentView] addSubview:pluralNounPopup]
    
    var scale = '2x';
    
    if(scale){ 
      var foundIndex = 0;
      for (i = 0; i < pluralNouns.length; ++i) {
        if(scale == pluralNouns[i]){
          [pluralNounPopup selectItemAtIndex:i]
          foundIndex = 1
        }
      }
    
      if(foundIndex != 1){
        [pluralNounPopup insertItemWithObjectValue:scale atIndex:0];
        [pluralNounPopup selectItemAtIndex:0]
      }
    } else {
      [pluralNounPopup selectItemAtIndex:0]
    }
    
    
    // Create buttons
    
    var yPosButtons = 15
    
    var uploadButton = [[NSButton alloc] initWithFrame:NSMakeRect(162, yPosButtons, 110, 46)]
    [uploadButton setTitle:"Share draft"]
    [uploadButton setBezelStyle:NSRoundedBezelStyle]
    [uploadButton setKeyEquivalent:"\r"]
    [uploadButton setCOSJSTargetFunction:function(sender) {
      [createProjectWindow orderOut:nil]
      [NSApp stopModal]
      var projectName = projectNameInputField.stringValue()
      if([projectName length]){
        var project = self.createProject(projectName);
        if(project){
          
          // Export with the correct scale
          var str = [pluralNounPopup objectValueOfSelectedItem];
          if (!str){
              str = [pluralNounPopup stringValue];
          }
          
          export_scale_factor = str.replace(/[^0-9.wWhH]/g,"");
          
          if(export_scale_factor.indexOf("w") !=-1 || export_scale_factor.indexOf("h") !=-1 || export_scale_factor.indexOf("W") !=-1 || export_scale_factor.indexOf("H") !=-1) {
            self.alert("We don't support w or h characters for scaling at this moment", "We dont allow these characters")
          } else {
            self.exportAllArtboardsAndSendTo(project.objectId, export_scale_factor)
          }
          
        }
      }else{
        self.alert("Seriously, don't you have any inspiration?", "Please specify a draft name") 
      }
    }]
    [uploadButton setAction:"callAction:"]
    [[createProjectWindow contentView] addSubview:uploadButton]
    
    var cancelButton = [[NSButton alloc] initWithFrame:NSMakeRect(77, yPosButtons, 92, 46)]
    [cancelButton setTitle:"Cancel"]
    [cancelButton setBezelStyle:NSRoundedBezelStyle]
    [cancelButton setCOSJSTargetFunction:function(sender) {
      [createProjectWindow orderOut:nil]
      [NSApp stopModal]
    }]
    [cancelButton setAction:"callAction:"]
    [[createProjectWindow contentView] addSubview:cancelButton]
    
    
    // Set default button
    
    [createProjectWindow setDefaultButtonCell:[uploadButton cell]]
    
    
    // Show window
    
    [NSApp runModalForWindow:createProjectWindow]
    
  },
  
  exportAllArtboardsAndSendTo: function(projectId, scale) {    
    
    this.copyStringToClipboard('http://www.draftforsket.ch/p/'+projectId);
    
    // Get all the artboards
    var artboards = [[doc currentPage] artboards]
    var loop = [artboards objectEnumerator]
    var existing_artboards_names = []
    
    
    // Find artboards with the same name
    while (artboard = [loop nextObject]) {
      var arrayLength = existing_artboards_names.length
      
      for (var i = 0; i < arrayLength; i++) {
        if(existing_artboards_names[i] == [artboard name]){
          this.alert("You have more than one artboard with the name '" + [artboard name]  + "', please change one of these artboard names.","Please rename one of these artboards in order to solve this issue.")
        return false
        } 
      }
      
      existing_artboards_names.push([artboard name])     
    
    }
    
    this.sendArtboardOnArray(artboards, scale, projectId)
  },
  
  sendArtboardOnArray: function(array, scale, projectId) {
    var loopFinal = [array objectEnumerator]
    
    while (item = [loopFinal nextObject]) {
    
      if (item.className() == "MSArtboardGroup") {
    
        var filename = this.escapedFileName([item name]) + ".png"
    
        this.debugLog("Artboard found with name " + filename + " and object id " + item.objectID())
        var path = NSTemporaryDirectory() + filename
        var version = this.copy_layer_with_factor(item, scale)
        [doc saveArtboardOrSlice: version toFile:path]
        
        // Upload to Parse
        this.uploadToParse(path, projectId, filename, item.objectID(), [[item frame] width], [[item frame] height])
      }
    }
  },
  
  uploadToParse: function(path, projectId, filename, uuid, width, height) {
    
    var task = NSTask.alloc().init()
    task.setLaunchPath("/usr/bin/curl")
    
    var args = NSArray.arrayWithObjects(
      "-v", 
      "POST", 
      "-H", "X-Parse-Application-Id: " + this.parseAppId, 
      "-H", "X-Parse-REST-API-Key: " + this.parseRestAPIKey, 
      "-H", "Content-Type: image/png", 
      "--data-binary", "@"+path, 
      "https://api.parse.com/1/files/"+filename, 
      nil
    )
    
    task.setArguments(args)
    
    var outputPipe = [NSPipe pipe]
    [task setStandardOutput:outputPipe]
    task.launch()
    var outputData = [[outputPipe fileHandleForReading] readDataToEndOfFile]
    var outputString = [[[NSString alloc] initWithData:outputData encoding:NSUTF8StringEncoding]]
    var response = JSON.parse(outputString)
    
    if(response.url){
      var task = NSTask.alloc().init()
      task.setLaunchPath("/usr/bin/curl")
      
      var args = NSArray.arrayWithObjects(
         "-v", 
         "POST", 
         "-H", "X-Parse-Application-Id: " + this.parseAppId, 
         "-H", "X-Parse-REST-API-Key: " + this.parseRestAPIKey, 
         "-H", "Content-Type: application/json", 
         "-d", '{"project": {"__type": "Pointer", "className": "Project", "objectId": "' + projectId + '"}, "picture": {"name": "' + response.name + '", "__type": "File"}, "width":'+width+', "height":'+height+', "filename": "'+filename+'"}', 
         "https://api.parse.com/1/classes/Artboard", 
         nil
       )
       
       task.setArguments(args)
       
       if(this.debug == true)
       {
         var outputPipe = [NSPipe pipe]
         [task setStandardOutput:outputPipe]
         task.launch()
         var outputData = [[outputPipe fileHandleForReading] readDataToEndOfFile]
         var outputString = [[[NSString alloc] initWithData:outputData encoding:NSUTF8StringEncoding]]
         this.debugLog(outputString)
       } else {
         task.launch()
       }
    }
  },
  
  createProject: function(name){
    var task = NSTask.alloc().init()
    task.setLaunchPath("/usr/bin/curl")
    
    var args = NSArray.arrayWithObjects(
       "-v", 
       "POST", 
       "-H", "X-Parse-Application-Id: " + this.parseAppId, 
       "-H", "X-Parse-REST-API-Key: " + this.parseRestAPIKey, 
       "-H", "Content-Type: application/json", 
       "-d", '{"name": "' + name + '"}', 
       "https://api.parse.com/1/classes/Project", 
       nil
     )
     
     task.setArguments(args)
     
     var outputPipe = [NSPipe pipe]
     [task setStandardOutput:outputPipe]
     task.launch()
     var outputData = [[outputPipe fileHandleForReading] readDataToEndOfFile]
     var outputString = [[[NSString alloc] initWithData:outputData encoding:NSUTF8StringEncoding]]
     if(outputString == ""){
       this.connectionError()
       return false
     }
     var response = JSON.parse(outputString)
     
     this.debugLog(response)
     
     return response
  },
  
  copyStringToClipboard: function(string) {
    var clipboard = NSPasteboard.generalPasteboard();
    clipboard.declareTypes_owner([NSPasteboardTypeString], null);
    clipboard.setString_forType(string , NSPasteboardTypeString);
    this.alert("Your files are still uploading in the background, so it can take a little before you see every artboard.", "The share URL has been copied to your clipboard.");
    return true;
  },
  
  isCompatible: function() {
    
    // Declarations
    
    var self = this;
    
    // Get configuration
    
    var task = NSTask.alloc().init()
    task.setLaunchPath("/usr/bin/curl")
    
    var args = NSArray.arrayWithObjects(
       "-v", 
       "GET", 
       "-H", "X-Parse-Application-Id: " + this.parseAppId, 
       "-H", "X-Parse-REST-API-Key: " + this.parseRestAPIKey, 
       "https://api.parse.com/1/config", 
       nil
     )
     
     task.setArguments(args)
     
     var outputPipe = [NSPipe pipe]
     [task setStandardOutput:outputPipe]
     task.launch()
     var outputData = [[outputPipe fileHandleForReading] readDataToEndOfFile]
     var outputString = [[[NSString alloc] initWithData:outputData encoding:NSUTF8StringEncoding]]
     if(outputString == ""){
       this.connectionError()
       return false
     }
     var response = JSON.parse(outputString)
     
     var currentVersionNumber = this.versionNumber.split(".")
     
     if(response.params.isCompatibleWithPluginVersion){
       var backendVersionNumber = response.params.isCompatibleWithPluginVersion.split(".")
       if(backendVersionNumber[0] == currentVersionNumber[0]){
         return true
       }else{
         self.showUpdateWindow()
         return false
       }
     }
  },
  
  showUpdateWindow: function(){
    
    // Declarations
    
    var self = this;
    
    
    // Create window
    
    var updateWindow = [[NSWindow alloc] init]
    [updateWindow setFrame:NSMakeRect(0, 0, 290, 155) display:false]
    [updateWindow setBackgroundColor:NSColor.whiteColor()]
    
    
    // Create prompt text
    
    var titleField = [[NSTextField alloc] initWithFrame:NSMakeRect(50, 80, 243, 17)]
    [titleField setEditable:false]
    [titleField setBordered:false]
    [titleField setDrawsBackground:false]
    [titleField setFont:[NSFont boldSystemFontOfSize:13]]
    [titleField setStringValue:"Draft for Sketch is outdated!"]
    [[updateWindow contentView] addSubview:titleField]
    
    
    // Create button
    
    var updateButton = [[NSButton alloc] initWithFrame:NSMakeRect(90, 30, 100, 46)]
    [updateButton setTitle:"Update now"]
    [updateButton setBezelStyle:NSRoundedBezelStyle]
    [updateButton setCOSJSTargetFunction:function(sender) {
      [updateWindow orderOut:nil]
      [NSApp stopModal]
      var url = [NSURL URLWithString:"http://www.draftforsket.ch/update"];
      if( ![[NSWorkspace sharedWorkspace] openURL:url] ){
        self.debugLog("Failed to open url:" + [url description])
      } 
    }]
    [updateButton setAction:"callAction:"]
    [[updateWindow contentView] addSubview:updateButton]
    
    
    // Set default button
    
    [updateWindow setDefaultButtonCell:[updateButton cell]]
    
    
    // Show window
    
    [NSApp runModalForWindow:updateWindow]
    
  },
  
  connectionError: function(){
    this.alert("Please check your internet connection and try again.", "Cannot connect to the internet.");
  },
  
  versionNumber: "1.0.1",
  parseAppId: "RUOAHU9b5mWztCXjnD4JZmXVHskNIrZkvFNil34j",
  parseRestAPIKey: "9MsGrDBFxtDtV0nrhAHFW4Qdvk3DYVsNCN9IGrtQ",
  debug: true

}