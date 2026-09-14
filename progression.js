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
      const clean = { points: 0, floorsCleared: 0, weaponLevel: 0, levels: {} };
      if (!this.storage) return clean;
      try {
        const saved = JSON.parse(this.storage.getItem(STORAGE_KEY) || "null");
        if (!saved || typeof saved !== "object") return clean;
        clean.points = Math.max(0, Number(saved.points) || 0);
        clean.floorsCleared = Math.max(0, Number(saved.floorsCleared) || 0);
        clean.weaponLevel = Math.max(0, Math.min(3, Number(saved.weaponLevel) || 0));
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

    weaponConfig() {
      const weapons = [
        { level: 0, name: "Ceļinieka zobens", texture: "weapon_regular_sword", cost: 20, damage: 0, glow: 0x000000 },
        { level: 1, name: "Bruņinieka zobens", texture: "weapon_knight_sword", cost: 45, damage: 1, glow: 0xd89a48 },
        { level: 2, name: "Asinsrūnas zobens", texture: "weapon_red_gem_sword", cost: 80, damage: 2, glow: 0xe34a38 },
        { level: 3, name: "Pelnu valdnieka zobens", texture: "weapon_lavish_sword", cost: null, damage: 3, glow: 0xffc766 }
      ];
      return weapons[this.state.weaponLevel || 0];
    }

    upgradeWeapon(gold) {
      const current = this.weaponConfig();
      if (current.cost == null || gold < current.cost) return { success: false, cost: current.cost, level: current.level };
      this.state.weaponLevel = Math.min(3, current.level + 1);
      this.save();
      return { success: true, cost: current.cost, level: this.state.weaponLevel };
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
