var Laser = (function () {
  function Laser (scene, angle, velX, velZ, playerPos) {
    this.mesh = new BABYLON.Mesh("laser", scene);
    this.mesh.applyToMesh(CreateVariableBox(1.5, 0.5, 0.5));
    var mat = new BABYLON.StandardMaterial("laserMat", parent);
    mat.diffuseColor = new BABYLON.Color3(0, 1, 0);
    this.mesh.material = mat;
    var x = playerPos.x;
    var z = playerPos.z;
    if (velX >= 0) {
      x += 1.5;
    }
    else {
      x -= 1.5;
    }
    if (velZ >= 0) {
      z += 1.5;
    }
    else {
      z -= 1.5;
    }
    this.mesh.position.copyFromFloats(x, 1, z);
    this.mesh.rotation.y -= angle;
    this.impulseVector = new BABYLON.Vector3(velX * 10, 0, velZ * 10);
    this.mesh.collisionsEnabled = true;
  }

  return Laser;
})();