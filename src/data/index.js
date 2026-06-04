const levelConfig = {
    level1: {
        label: "Level 1",
        password: "l1speaking",
        targetLevel: "Basic Scene Speaking",
    },
    level2: {
        label: "Level 2",
        password: "l2speaking",
        targetLevel: "Intermediate Story Speaking",
    },
};

const scriptModules = import.meta.glob("../scripts/**/*.json", {
    eager: true,
});

function getLevelFromPath(path) {
    const match = path.match(/scripts\/(level\d+)\//);
    return match ? match[1] : null;
}

function getFileNameFromPath(path) {
    const parts = path.split("/");
    return parts[parts.length - 1];
}
const lessons = {};

Object.entries(levelConfig).forEach(([levelKey, config]) => {
    lessons[levelKey] = {
        ...config,
        units: [],
    };
});

Object.entries(scriptModules).forEach(([path, module]) => {
    const levelKey = getLevelFromPath(path);

    if (!levelKey || !lessons[levelKey]) return;

    const unitData = module.default;
    const fileName = getFileNameFromPath(path);

    lessons[levelKey].units.push({
        id: fileName.replace(".json", ""),
        ...unitData,
    });
});

Object.keys(lessons).forEach((levelKey) => {
    lessons[levelKey].units.sort((a, b) => a.id.localeCompare(b.id));
});

export { lessons };