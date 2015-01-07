var GameScene = (function () {

  function getRandomCoordinate () {
    var coord = -30 + Math.round(Math.random() * 60);
    if (coord < 0 && coord > -3) {
      coord -= 3;
    }
    if (coord > 0 && coord < 3) {
      coord += 3;
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

    this.bindEvents();

    this.addObjects();
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
    this.time = Date.now();
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

  GameScene.prototype.addEnemy = function (cubeTrackArray) {
    var attempts = 0;

    var validCoords = false;

    var x, z;

    while (!validCoords) {
      var validCoords = true;

      x = getRandomCoordinate();
      z = getRandomCoordinate();

      for (var i = cubeTrackArray.length - 1; i >= 0; i--) {
        var otherCube = cubeTrackArray[i];
        var diff = (1 + otherCube.size * 0.2);
        if (Math.abs(x - otherCube.x) < diff || Math.abs(z - otherCube.z) < diff) {
          validCoords = false;
          break;
        }
      }

      attempts++;

      if (attempts > 60) {
        return;
      }
    }
    this.enemies.push(new Enemy(this, x, z));
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
    plane.diffuseColor = new BABYLON.Color3(0, 0, 0);
    this.plane = plane;
    this.plane.checkCollisions = true;

    this.player = new Player(this.scene);
    this.addLighting();
    this.camera.parent = this.player.mesh;
    this.camera.position.y = 20;
    this.camera.cameraRotation.x = (Math.PI / 4);

    this.scene.activeCamera = this.camera;

    var cubeTrackArray = [];
    this.cubes = [];
    for (var i = 0; i < 35; i++) {
      this.addCube(this.cubes, cubeTrackArray);
    }

    for (var i = 0; i < 20; i++) {
      this.addEnemy(cubeTrackArray);
    }

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
    window.addEventListener("resize", this.resizeEvent.bind(this), false);

    this.mouseControls = new MouseControls();
    this.mouseControls.bindTouch();

    this.keyControls = new KeyControls();
    this.keyControls.bindKey("W");
    this.keyControls.bindKey("D");
    this.keyControls.bindKey("A");
    this.keyControls.bindKey("S");
  }

  GameScene.prototype.removeEnemy = function(enemy) {
    enemy.mesh.dispose()
    this.enemies.splice(this.enemies.indexOf(enemy), 1);
  }

  GameScene.prototype.removeEvents = function () {
    this.mouseControls.unbind();
    this.keyControls.unbind();
    window.removeEventListener("resize", this.resizeEvent.bind(this));
  }

  GameScene.prototype.removeLaser = function(laser) {
    laser.mesh.dispose();
    this.lasers.splice(this.lasers.indexOf(laser), 1);
  }

  GameScene.prototype.render = function () {
    var endScene = false;

    this.player.update();

    for (var i = this.enemies.length - 1; i >= 0; i--) {
      var enemy = this.enemies[i];
      endScene |= enemy.update(this.player);
      for (var l = this.lasers.length - 1; l >= 0; l--) {
        var laser = this.lasers[l];
        if (enemy.mesh.intersectsMesh(laser.mesh, false)) {
          this.removeEnemy(enemy);
          this.removeLaser(laser);
        }
      }
    }

    for (var i = this.lasers.length - 1; i >= 0; i--) {
      var laser = this.lasers[i];
      laser.update();
      for (var c = this.cubes.length - 1; c >= 0; c--) {
        var cube = this.cubes[c];
        if (cube.intersectsMesh(laser.mesh, false)) {
          this.removeLaser(laser);
        }
      }

      for (var w = this.walls.length - 1; w >= 0; w--) {
        var wall = this.walls[w];
        if (wall.intersectsMesh(laser.mesh, false)) {
          this.removeLaser(laser);
        }
      }
    }
    this.scene.render();
    if (endScene) {
      this.removeEvents();
      this.showEndScreen();
    }
  }

  GameScene.prototype.resizeEvent = function () {
    this.engine.resize();
    this.canvas.style.width = (window.innerWidth) + 'px';
    this.canvas.style.height = (window.innerHeight) + 'px';
  }

  GameScene.prototype.showEndScreen = function () {
    this.engine.stopRenderLoop();
    var canvas = document.getElementById("screen");
    document.body.removeChild(canvas);
    var loss = new ImageScreen("retry");
    this.player.mesh.dispose();
    this.player = null;
    for (var i = this.cubes.length - 1; i >= 0; i--) {
      this.cubes[i].dispose();
    }

    this.cubes = [];

    for (var i = this.enemies.length - 1; i >= 0; i--) {
      this.enemies[i].mesh.dispose();
    }

    this.enemies = [];
    this.plane.dispose();
    this.camera.dispose();

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

  return GameScene;
})();