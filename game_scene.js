var GameScene = (function () {

  function select (position) {
    var selection = new BABYLON.Tools.SmartArray(256);

    for (var index = 0; index < octree.blocks.length; index++) {
      var block = octree.blocks[index];
      blockSelect(block, position,selection);
    }

    return selection;
  }

  function blockSelect (block, position, selection) {
    if (block.blocks) {
      for (var index = 0; index < block.blocks.length; index++) {
        var block = block.blocks[index];
        blockSelect(block, position, selection);
      }
      return;
    }
  }


  function getRandomCoordinate () {
    var coord = -30 + Math.round(Math.random() * 60);
    if (coord < 0 && coord > -6) {
      coord -= 3;
    }
    if (coord > 0 && coord < 6) {
      coord += 6;
    }
    return coord;
  }

  function GameScene (engine, canvas) {
    this.canvas = canvas;
    this.scene = new BABYLON.Scene(engine);
    this.scene.collisionsEnabled = true;
    if (window.location.hash.indexOf('debug') !== -1) {
      this.scene.debugLayer.show();
    }
    this.scene.gravity = new BABYLON.Vector3(0, -9.81, 0);
    this.scene.clearColor = new BABYLON.Color3(0.8, 0.8, 0.8);
    this.engine = engine;

    this.enemies = [];
    this.lasers = [];
    this.walls = [];

    var img = new Image();
    img.id = 'pause';
    img.src = 'img/pause.png';
    document.body.appendChild(img);

    this.bindEvents();
    var waveCounter = document.createElement('p');
    this.waveCount = 1;
    this.waveEnemyCount = 20;
    waveCounter.id = 'wavecounter';
    document.body.appendChild(waveCounter);

    this.addObjects();
    this.setMobileStatus();
    this.time = Date.now();
    this.startCountdown();
    this.shouldUpdate = true;
    if (this.isMobile) {
      this.showInstructions('drag', 'touchimage');
    }
    else {
      this.showInstructions('keyboard', 'mouse');
    }
  }

  GameScene.prototype.addCube = function (cubes, cubeTrackArray) {
    var size = Math.ceil(Math.random() * 3);
    var coords = new BABYLON.Vector3(0, size / 2, 0);
    var attempts = 0;
    var validCoords = false;

    while (!validCoords) {
      var validCoords = true;

      for (var i = cubeTrackArray.length - 1; i >= 0; i--) {
        var otherCube = cubeTrackArray[i];
        var diff = (size + otherCube.size * 0.2);
        if (Math.abs(coords.x - otherCube.x) < diff || Math.abs(coords.z - otherCube.z) < diff) {
          validCoords = false;
          break;
        }
      }

      coords.x = getRandomCoordinate();
      coords.z = getRandomCoordinate();
      attempts++;
      if (attempts > 60) {
        return;
      }
    }

    var cube = new BABYLON.Mesh.CreateBox("box", size, this.scene);
    cube.position = coords;
    var material = new BABYLON.StandardMaterial("cubeMat", this.scene);
    material.diffuseColor = new BABYLON.Color3(Math.random(), Math.random(), Math.random());
    cube.material = material;

    cube.checkCollisions = true;
    cube.ellipsoid = new BABYLON.Vector3(0.5, 1, 0.5);
    cubeTrackArray.push({ x: cube.position.x, z: cube.position.z, size: size });
    cubes.push(cube);
  }

  GameScene.prototype.addLaser = function (laser) {
    this.lasers.push(laser);
  }

  GameScene.prototype.addLighting = function () {
    this.cameraLight = new BABYLON.PointLight("light", new BABYLON.Vector3(0, 1, 0), this.scene);
    this.cameraLight.diffuse = new BABYLON.Color3(1, 1, 1);
    this.cameraLight.parent = this.player.mesh;
  }

  GameScene.prototype.addObjects = function () {
    this.camera = new BABYLON.TargetCamera("FollowCam", new BABYLON.Vector3(0, 0, 0), this.scene);

    var plane = new BABYLON.Mesh.CreateGround("ground", 90, 90, 1, this.scene);
    this.plane = plane;
    this.plane.checkCollisions = true;

    this.player = new Player(this.scene);
    this.addLighting();
    this.camera.parent = this.player.mesh;
    this.camera.position.y = 20;
    this.camera.cameraRotation.x = (Math.PI / 4);

    this.scene.activeCamera = this.camera;

    this.cubeTrackArray = [];
    this.cubes = [];
    for (var i = 0; i < 35; i++) {
      this.addCube(this.cubes, this.cubeTrackArray);
    }

    this.createWave(this.waveEnemyCount);
    this.addWalls();
  }

  GameScene.prototype.addWalls = function () {
    var wallOne = CreateVariableBox(this.scene, 70, 5, 1);
    wallOne.position.copyFromFloats(1, 2.5, -34);
    wallOne.checkCollisions = true;

    var wallTwo = CreateVariableBox(this.scene, 70, 5, 1);
    wallTwo.position.copyFromFloats(1, 2.5, 36);
    wallTwo.checkCollisions = true;

    var wallThree = CreateVariableBox(this.scene, 1, 5, 70);
    wallThree.position.copyFromFloats(36, 2.5, 1);
    wallThree.checkCollisions = true;

    var wallFour = CreateVariableBox(this.scene, 1, 5, 70);
    wallFour.position.copyFromFloats(-34, 2.5, 1);
    wallFour.checkCollisions = true;

    this.walls.push(wallOne);
    this.walls.push(wallTwo);
    this.walls.push(wallThree);
    this.walls.push(wallFour);
  }

  GameScene.prototype.bindEvents = function () {
    var _this = this;
    window.addEventListener("resize", this.resizeEvent.bind(this), false);
    window.addEventListener("blur", this.blurEvent.bind(this), false);
    window.addEventListener("focus", this.focusEvent.bind(this), false);

    this.mouseControls = new MouseControls();
    this.mouseControls.bindTouch();

    document.getElementById('pause').addEventListener(this.mouseControls.getMouseDownEvent(), this.pauseEvent.bind(this), false);

    this.keyControls = new KeyControls();
    this.keyControls.bindKey("W");
    this.keyControls.bindKey("D");
    this.keyControls.bindKey("A");
    this.keyControls.bindKey("S");
  }

  GameScene.prototype.blurEvent = function () {
    this.paused = true;
    this.pausedTime = Date.now();
  }

  GameScene.prototype.createWave = function (count) {
    this.wave = new Wave(this, count, this.cubeTrackArray);
  }

  GameScene.prototype.endWave = function () {
    this.waveCount++;
    this.shouldUpdate = false;
    var p = document.createElement("p");
    p.innerText = "Wave complete!";
    p.id = "msg";
    p.style.top = (window.innerHeight / 2 - 14) + "px";
    document.body.appendChild(p);
    this.endTimer = Date.now();
  }

  GameScene.prototype.focusEvent = function () {
    this.paused = false;
    var unpauseTime = Date.now();
    var delta = unpauseTime - this.pausedTime;

    for (var i = this.lasers.length - 1; i >= 0; i--) {
      var laser = this.lasers[i];
      laser.time += delta;
    }
    this.time += delta;
    this.startCountdownTime += delta;
    this.endTimer += delta;
  }

  GameScene.prototype.nextWave = function () {
    var p = document.getElementById('msg');
    document.body.removeChild(p);
    this.player.resetHealth();

    if (this.waveCount < 3) {
      this.waveEnemyCount += 4;
    }
    else if (this.waveCount < 10) {
      this.waveEnemyCount += 3;
    }
    else {
      this.waveEnemyCount += 2;
    }

    this.player.mesh.position.x = 0;
    this.player.mesh.position.z = 0;
    this.wave.enemies = [];
    this.removeAllLasers();
    this.createWave(this.waveEnemyCount);
    this.startCountdown();
  }

  GameScene.prototype.pauseEvent = function () {
    if (this.paused) {
      this.focusEvent();
    }
    else {
      this.blurEvent();
    }
  }

  GameScene.prototype.removeAllLasers = function() {
    for (var i = this.lasers.length - 1; i >= 0; i--) {
      var laser = this.lasers[i];
      laser.mesh.dispose();
    }
    this.lasers = [];
  }

  GameScene.prototype.removeEvents = function () {
    this.mouseControls.unbind();
    this.keyControls.unbind();
    window.removeEventListener("resize", this.resizeEvent.bind(this));
    window.removeEventListener("blur", this.blurEvent.bind(this));
    window.removeEventListener("focus", this.focusEvent.bind(this));
    document.getElementById('pause').removeEventListener(this.mouseControls.getMouseDownEvent(), this.pauseEvent.bind(this));
  }

  GameScene.prototype.removeInstructions = function () {
    var tags = document.getElementsByClassName('left-controls');
    for (var i = tags.length - 1; i >= 0; i--) {
      document.body.removeChild(tags[i]);
    }

    var tags = document.getElementsByClassName('right-controls');
    for (var i = tags.length - 1; i >= 0; i--) {
      document.body.removeChild(tags[i]);
    }
  }

  GameScene.prototype.removeLaser = function(laser) {
    laser.mesh.dispose();
    this.lasers.splice(this.lasers.indexOf(laser), 1);
  }

  GameScene.prototype.render = function () {
    var endScene = false;

    if (this.paused) {
      return;
    }
    if (this.countdown) {
      var diff = Date.now() - this.startCountdownTime;
      if ((diff >= 1000 && this.currentCountDown === 3) || (diff >= 2000 && this.currentCountDown === 2)) {
        this.currentCountDown--;
        this.plane.material.diffuseTexture.drawText(this.currentCountDown, null, 540, "bold 100px Helvetica", "white", "#555555");
      }
      else if (diff >= 3000 && this.currentCountDown === 1) {
        this.countdown = false;
        this.shouldUpdate = true;
        this.plane.material.diffuseTexture.drawText("", null, 540, "bold 100px Helvetica", "white", "#555555");
        this.removeInstructions();
        this.player.drawHealth();
      }
    }
    else if(this.shouldUpdate) {
      endScene = this.update(endScene);
    }
    else {
      if (Date.now() - this.endTimer > 2000) {
        this.nextWave();
      }
    }
    this.scene.render();
    if (endScene) {
      this.removeEvents();
      this.showEndScreen();
    }
    else if (this.wave.enemies.length === 0 && this.shouldUpdate) {
      this.endWave();
    }
  }

  GameScene.prototype.resizeEvent = function () {
    this.engine.resize();
    this.canvas.style.width = (window.innerWidth) + 'px';
    this.canvas.style.height = (window.innerHeight) + 'px';
  }

  GameScene.prototype.setMobileStatus = function () {
    var ua = window.navigator.userAgent;
    // iOS Device ?
    var iOS = ua.match(/iPhone|iPad|iPod/i) || false;
    // Android Device ?
    var android = ua.match(/Android/i) || false;
    var android2 = ua.match(/Android 2/i) || false;
    // Windows Device ?
    var wp = ua.match(/Windows Phone/i) || false;
    // Kindle device ?
    var BlackBerry = ua.match(/BlackBerry/i) || false;
    // Kindle device ?
    var Kindle = ua.match(/Kindle|Silk.*Mobile Safari/i) || false;
    this.isMobile = ua.match(/Mobi/i) ||
      iOS ||
      android ||
      wp ||
      BlackBerry ||
      Kindle ||
      iOS || false;
  }

  GameScene.prototype.showEndScreen = function () {
    this.engine.stopRenderLoop();
    var canvas = document.getElementById("screen");
    document.body.removeChild(canvas);
    var loss = new ImageScreen("retry");
    this.player.cleanup();
    this.player = null;
    for (var i = this.cubes.length - 1; i >= 0; i--) {
      this.cubes[i].dispose();
    }

    this.cubes = [];

    this.wave.removeAll();
    this.wave = null;
    this.plane.dispose();
    this.camera.dispose();
    this.removeAllLasers();

    document.body.removeChild(document.getElementById('pause'));

    for (var i = this.walls.length - 1; i >= 0; i--) {
      this.walls[i].dispose();
    }
    loss.stageImage(function () {
      canvas = document.createElement("canvas");
      canvas.id = 'screen';
      document.body.appendChild(canvas);
      canvas.style.width = (window.innerWidth) + 'px';
      canvas.style.height = (window.innerHeight) + 'px';
      var engine = new BABYLON.Engine(canvas, true);
      window.scene = new GameScene(engine, canvas);
      engine.runRenderLoop(function () {
        window.scene.render();
      });
    });
  }

  GameScene.prototype.showInstructions = function (left, right) {
    var leftControls = new Image();
    leftControls.src = 'img/'+ left +'.png';
    leftControls.onload = function () {
      leftControls.className = "left-controls";
      document.body.appendChild(leftControls);
    }

    var rightControls = new Image();
    rightControls.src = 'img/'+ right +'.png';
    rightControls.onload = function () {
      rightControls.className = "right-controls";
      document.body.appendChild(rightControls);
    }
  }

  GameScene.prototype.startCountdown = function () {
    this.countdown = true;
    var countdownTexture = new BABYLON.DynamicTexture("dynamic texture", 1024, this.scene, true);
    this.plane.material = new BABYLON.StandardMaterial("plane", this.scene);
    this.plane.material.diffuseTexture = countdownTexture;
    this.plane.material.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
    this.plane.material.backFaceCulling = false;
    this.startCountdownTime = Date.now();
    this.currentCountDown = 3;

    countdownTexture.drawText(this.currentCountDown, null, 540, "bold 100px Helvetica", "white", "#555555");
  }

  GameScene.prototype.update = function (endScene) {
    this.player.update();

    var enemies = this.wave.enemies;

    for (var i = enemies.length - 1; i >= 0; i--) {
      var enemy = enemies[i];
      endScene |= enemy.update(this.player);
    }

    for (var i = this.lasers.length - 1; i >= 0; i--) {
      var laser = this.lasers[i];
      laser.update();
    }

    var octree = this.scene.createOrUpdateSelectionOctree();

    for (var i = this.lasers.length - 1; i >= 0; i--) {
      var laser = this.lasers[i];
      var meshes = octree.intersects(laser.mesh.position, 1, false);
      for (var i = meshes.length - 1; i >= 0; i--) {
        var mesh = meshes.data[i];
        if (mesh.name !== "laser" && mesh.name !== "ground" && mesh.name !== "player" && laser.mesh.intersectsMesh(mesh, false)) {
          this.removeLaser(laser);
          if (mesh.name === "enemy") {
            gameAudio.hit.play();
            this.wave.removeEnemy(mesh.refObject);
          }
        }
      }
    }

    return endScene;
  }

  GameScene.getRandomCoordinate = getRandomCoordinate;

  return GameScene;
})();
