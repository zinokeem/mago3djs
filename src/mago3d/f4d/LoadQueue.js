'use strict';

/**
 * LoadData
 * 
 * @alias LoadData
 * @class LoadData
 */
var LoadData = function() 
{
	if (!(this instanceof LoadData)) 
	{
		throw new Error(Messages.CONSTRUCT_ERROR);
	}

	// dataType:
	// 1. referencesArray.
	// 2. blocksArray.
	// 3. skinData. (octree's skinData & lod3,4,5 skinData).
	// 4. skinTexture.
	
	this.dataType;
	this.distToCam;
	this.lod;
	this.filePath;
	this.texFilePath;
	this.skinMesh;
	this.octree;
	this.texture;
};

LoadData.prototype.deleteObjects = function()
{
	// here deletes deletable objects.***
	this.dataType = undefined;
	this.distToCam = undefined;
	this.lod = undefined;
	this.filePath = undefined;
	this.texFilePath = undefined;
	this.skinMesh = undefined;
	this.octree = undefined;
	this.texture = undefined;
};

/**
 * LoadQueue
 * 
 * @alias LoadQueue
 * @class LoadQueue
 */
var LoadQueue = function(magoManager) 
{
	if (!(this instanceof LoadQueue)) 
	{
		throw new Error(Messages.CONSTRUCT_ERROR);
	}
	
	this.magoManager;
	
	if (magoManager !== undefined)
	{ this.magoManager = magoManager; }
	
	this.lod2SkinDataMap = {}; // includes data & texture.***
	this.lod2PCloudDataMap = {}; 
	
	this.lowLodSkinDataMap = {};
	this.lowLodSkinTextureMap = {};

	//this.referencesToLoadMap = {};
};

LoadQueue.prototype.putLod2SkinData = function(octree, filePath, texture, texFilePath, aValue)
{
	// "aValue" no used yet.***
	octree.lego.fileLoadState = CODE.fileLoadState.IN_QUEUE;
	var loadData = new LoadData();
	loadData.filePath = filePath;
	loadData.octree = octree;
	
	loadData.texFilePath = texFilePath;
	loadData.texture = texture;
	
	this.lod2SkinDataMap[filePath] = loadData;
};

LoadQueue.prototype.putLod2PCloudData = function(octree, filePath, texture, texFilePath, aValue)
{
	// "aValue" no used yet.***
	octree.lego.fileLoadState = CODE.fileLoadState.IN_QUEUE;
	var loadData = new LoadData();
	loadData.filePath = filePath;
	loadData.octree = octree;
	
	loadData.texFilePath = texFilePath;
	loadData.texture = texture;
	
	this.lod2PCloudDataMap[filePath] = loadData;
};

LoadQueue.prototype.putLowLodSkinData = function(skinMesh, filePath, aValue)
{
	// "aValue" no used yet.***
	skinMesh.fileLoadState = CODE.fileLoadState.IN_QUEUE;
	
	var loadData = new LoadData();
	loadData.dataType = 3;
	loadData.filePath = filePath;
	loadData.skinMesh = skinMesh;
	this.lowLodSkinDataMap[skinMesh.legoKey] = loadData;
};

LoadQueue.prototype.putLowLodSkinTexture = function(filePath, texture, aValue)
{
	// "aValue" no used yet.***
	texture.fileLoadState = CODE.fileLoadState.IN_QUEUE;
	
	var loadData = new LoadData();
	loadData.dataType = 4;
	loadData.filePath = filePath;
	loadData.texture = texture;
	this.lowLodSkinTextureMap[filePath] = loadData;
};

LoadQueue.prototype.resetQueue = function()
{
	for (var key in this.lod2SkinDataMap)
	{
		var loadData = this.lod2SkinDataMap[key];
		if (loadData.octree === undefined || loadData.octree.lego === undefined)
		{ continue; }
		
		loadData.octree.lego.fileLoadState = CODE.fileLoadState.READY;
	}
	
	this.lod2SkinDataMap = {};
	
	// Low lod meshes.***
	for (var key in this.lowLodSkinDataMap)
	{
		var loadData = this.lowLodSkinDataMap[key];
		if (loadData.skinMesh === undefined)
		{ continue; }
		
		loadData.skinMesh.fileLoadState = CODE.fileLoadState.READY;
	}
	
	this.lowLodSkinDataMap = {};
	
	for (var key in this.lowLodSkinTextureMap)
	{
		var loadData = this.lowLodSkinTextureMap[key];
		if (loadData.texture === undefined)
		{ continue; }
		
		loadData.texture.fileLoadState = CODE.fileLoadState.READY;
	}
	
	this.lowLodSkinTextureMap = {};
	
	for (var key in this.lod2PCloudDataMap)
	{
		var loadData = this.lod2PCloudDataMap[key];
		if (loadData.octree === undefined || loadData.octree.lego === undefined)
		{ continue; }
		
		loadData.octree.lego.fileLoadState = CODE.fileLoadState.READY;
	}
	
	this.lod2PCloudDataMap = {};
};

LoadQueue.prototype.manageQueue = function()
{
	var maxFileLoad = 1;
	var readerWriter = this.magoManager.readerWriter;
	var gl = this.magoManager.sceneState.gl;
	var counter = 0;
	var remainLod2 = false;
	
	// Lod2 meshes, 1rst load texture.***.***
	counter = 0;
	for (var key in this.lod2SkinDataMap)
	{
		var loadData = this.lod2SkinDataMap[key];
		var octree = loadData.octree;
		var filePath = loadData.filePath;
		
		if (octree.lego !== undefined)
		{
			if (loadData.texture !== undefined && loadData.texture.fileLoadState === CODE.fileLoadState.READY)
			{ 
				readerWriter.readLegoSimpleBuildingTexture(gl, loadData.texFilePath, loadData.texture, this.magoManager); 
				counter += 4;
			}
			
			readerWriter.getOctreeLegoArraybuffer(filePath, octree, this.magoManager);
		}
		else
		{ var hola = 0; }
		
		delete this.lod2SkinDataMap[key];
		loadData.deleteObjects();
		loadData = undefined;

		counter++;
		if (counter > 4)
		{
			//this.lod2SkinDataMap = {};
			remainLod2 = true;
			break;
		}
	}
	
	if (this.magoManager.fileRequestControler.isFullPlusLowLodImages())	
	{ 
		return; 
	}
	
	// Low lod meshes ( lod 3, 4, 5).***
	counter = 0;
	for (var key in this.lowLodSkinTextureMap)
	{
		var loadData = this.lowLodSkinTextureMap[key];
		var skinMesh = loadData.skinMesh;
		var filePath = loadData.filePath;
		readerWriter.readLegoSimpleBuildingTexture(gl, filePath, loadData.texture, this.magoManager);
		
		delete this.lowLodSkinTextureMap[key];
		loadData.deleteObjects();
		loadData = undefined;
		
		counter++;
		if (counter > maxFileLoad)
		{ break; }
	}
	
	counter = 0;
	for (var key in this.lowLodSkinDataMap)
	{
		var loadData = this.lowLodSkinDataMap[key];
		var skinMesh = loadData.skinMesh;
		var filePath = loadData.filePath;
		readerWriter.getLegoArraybuffer(filePath, skinMesh, this.magoManager);
		
		delete this.lowLodSkinDataMap[key];
		loadData.deleteObjects();
		loadData = undefined;
		
		counter++;
		if (counter > maxFileLoad)
		{ break; }
	}
	
	// pCloud data.***
	counter = 0;
	for (var key in this.lod2PCloudDataMap)
	{
		var loadData = this.lod2PCloudDataMap[key];
		var octree = loadData.octree;
		var filePath = loadData.filePath;
		
		if (octree.lego !== undefined)
		{
			readerWriter.getOctreePCloudArraybuffer(filePath, octree, this.magoManager);
		}
		else
		{ var hola = 0; }
		
		delete this.lod2PCloudDataMap[key];
		loadData.deleteObjects();
		loadData = undefined;

		counter++;
		if (counter > 4)
		{
			//this.lod2PCloudDataMap = {};
			remainLod2 = true;
			break;
		}
	}
	
	this.resetQueue();
};





























