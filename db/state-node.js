class StateNode {
  constructor() {
    this.isLeaf = false;
    // Used for internal nodes only.
    this.childMap = new Map();
    // Used for leaf nodes only.
    this.value = null;
  }

  static create(isLeaf, childMap, value) {
    const node = new StateNode();
    node.isLeaf = isLeaf;
    node.childMap = new Map(childMap);
    node.value = value;
    return node;
  }

  makeCopy() {
    return StateNode.create(this.isLeaf, this.childMap, this.value);
  }

  getIsLeaf() {
    return this.isLeaf;
  }

  setIsLeaf(isLeaf) {
    this.isLeaf = isLeaf;
  }

  resetValue() {
    this.setValue(null);
    this.setIsLeaf(false);
  }

  setValue(value) {
    this.value = value;
    this.setIsLeaf(true);
  }

  getValue() {
    return this.value;
  }

  setChild(label, stateNode) {
    this.childMap.set(label, stateNode);
    if (this.getIsLeaf()) {
      this.setIsLeaf(false);
    }
  }

  getChild(label) {
    const child = this.childMap.get(label);
    if (child === undefined) {
      return null;
    }
    return child;
  }

  hasChild(label) {
    return this.childMap.has(label);
  }

  deleteChild(label) {
    this.childMap.delete(label);
    if (this.getNumChild() === 0) {
      this.setIsLeaf(true);
    }
  }

  getChildLabels() {
    return [ ...this.childMap.keys() ];
  }

  getChildNodes() {
    return [ ...this.childMap.values() ];
  }

  getNumChild() {
    return this.childMap.size;
  }

  getProofHash() {
    // TODO(minsu): Implement this.
  }

  setProofHash() {
    // TODO(minsu): Implement this.
  }

  addVersion() {
    // TODO(lia): Implement this.
  }

  hasVersion() {
    // TODO(lia): Implement this.
  }

  deleteVersion() {
    // TODO(lia): Implement this.
  }

  getVersions() {
    // TODO(lia): Implement this.
  }

  resetVersions() {
    // TODO(lia): Implement this.
  }
}

module.exports = StateNode;