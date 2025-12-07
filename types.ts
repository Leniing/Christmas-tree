import * as THREE from 'three';

export enum InteractionState {
  Tree = 0,
  Exploded = 1
}

export interface ShapeProps {
  count: number;
  mode: InteractionState;
  tempObject: THREE.Object3D;
}