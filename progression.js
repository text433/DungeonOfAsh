(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.DungeonProgression = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const STORAGE_KEY = "dungeonOfAshProgressionV1";
  const TALENTS = Object.freeze({
    ironHeart: Object.freeze({ branch: "vitality", maxLevel: 1, requires: null, title: "Dzelzs sirds" }),
    bloodSip: Object.freeze({ branch: "vitality", maxLevel: 1, requires: "ironHeart", title: "Dzīvības dzirksts" }),
    stoneGuard: Object.freeze({ branch: "vitality", maxLevel: 1, requires: "bloodSip", title: "Akmens sargs" }),
    sharpEdge: Object.freeze({ branch: "hunter", maxLevel: 1, requires: null, title: "Asā mala" }),
    swiftBoots: Object.freeze({ branch: "hunter", maxLevel: 1, requires: "sharpEdge", title: "Ātrie zābaki" }),
    longReach: Object.freeze({ branch: "hunter", maxLevel: 1, requires: "swiftBoots", title: "Garais cirtiens" }),
    ashWard: Object.freeze({ branch: "ash", maxLevel: 1, requires: null, title: "Pelnu vairogs" }),
    burningWard: Object.freeze({ branch: "ash", maxLevel: 1, requires: "ashWard", title: "Degošais vairogs" }),
    renewal: Object.freeze({ branch: "ash", maxLevel: 1, requires: "burningWard", title: "Atdzimšana" })
  });

  class ProgressionSystem {
    constructor(storage) {
      this.storage = storage || (typeof localStorage !== "undefined" ? localStorage : null);
      this.state = this.load();
    }

    load() {
      const clean = { points: 0, floorsCleared: 0, levels: {} };
      if (!this.storage) return clean;
      try {
        const saved = JSON.parse(this.storage.getItem(STORAGE_KEY) || "null");
        if (!saved || typeof saved !== "object") return clean;
        clean.points = Math.max(0, Number(saved.points) || 0);
        clean.floorsCleared = Math.max(0, Number(saved.floorsCleared) || 0);
        Object.keys(TALENTS).forEach((id) => {
          clean.levels[id] = Math.max(0, Math.min(TALENTS[id].maxLevel, Number(saved.levels?.[id]) || 0));
        });
      } catch (_error) {
        return clean;
      }
      return clean;
    }

    save() {
      if (this.storage) this.storage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      return this.snapshot();
    }

    snapshot() {
      return JSON.parse(JSON.stringify(this.state));
    }

    has(id) {
      return (this.state.levels[id] || 0) >= 1;
    }

    canSpend(id) {
      const node = TALENTS[id];
      if (!node || this.state.points < 1 || (this.state.levels[id] || 0) >= node.maxLevel) return false;
      return !node.requires || this.has(node.requires);
    }

    spend(id) {
      if (!this.canSpend(id)) return false;
      this.state.points -= 1;
      this.state.levels[id] = (this.state.levels[id] || 0) + 1;
      this.save();
      return true;
    }

    awardFloorPoint() {
      this.state.points += 1;
      this.state.floorsCleared += 1;
      this.save();
      return this.state.points;
    }

    bonuses() {
      return {
        maxHp: this.has("ironHeart") ? 2 : 0,
        healOnKill: this.has("bloodSip") ? 1 : 0,
        blockChance: this.has("stoneGuard") ? 0.2 : 0,
        attackDamage: this.has("sharpEdge") ? 1 : 0,
        speedMultiplier: this.has("swiftBoots") ? 1.15 : 1,
        attackRange: this.has("longReach") ? 8 : 0,
        unlockWard: this.has("ashWard"),
        wardDamage: this.has("burningWard") ? 1 : 0,
        wardHeal: this.has("renewal") ? 2 : 0
      };
    }
  }

  return Object.freeze({
    STORAGE_KEY,
    TALENTS,
    ProgressionSystem,
    progression: new ProgressionSystem()
  });
});
