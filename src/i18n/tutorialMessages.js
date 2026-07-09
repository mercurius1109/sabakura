export const tutorialMessages = {
  ja: {
    tutorial: {
      panel: {
        title: "\u30c1\u30e5\u30fc\u30c8\u30ea\u30a2\u30eb",
        stepCounter: "\u30b9\u30c6\u30c3\u30d7 {current} / {total}",
        inProgress: "\u9032\u884c\u4e2d",
        complete: "\u5b8c\u4e86",
        requirements: "\u5fc5\u8981\u6761\u4ef6",
        highlightHint: "\u5149\u3063\u3066\u3044\u308b\u5bfe\u8c61\u3092\u76ee\u5370\u306b\u9032\u3081\u3066\u304f\u3060\u3055\u3044\u3002",
        completeTitle: "\u30c1\u30e5\u30fc\u30c8\u30ea\u30a2\u30eb\u5b8c\u4e86",
        completeDescription: "\u6751\u306e\u57fa\u790e\u304c\u6574\u3044\u307e\u3057\u305f\u3002\u3053\u3053\u304b\u3089\u306f\u81ea\u7531\u306b\u62e1\u5f35\u3057\u3066\u3044\u3051\u307e\u3059\u3002",
      },
      requirement: {
        villagers: "\u6751\u4eba",
        stationWorkers: "{station} \u306e\u62c5\u5f53\u4eba\u6570",
      },
      step: {
        gather: {
          title: "{item}\u3092\u96c6\u3081\u3088\u3046",
          description: "\u30d5\u30a3\u30fc\u30eb\u30c9\u3067{item}\u3092\u62fe\u3063\u3066\u304f\u3060\u3055\u3044\u3002",
        },
        craft: {
          title: "{item}\u3092\u4f5c\u308d\u3046",
          handDescription: "\u30d7\u30ec\u30a4\u30e4\u30fc\u3092\u958b\u3044\u3066\u624b\u4f5c\u696d\u30af\u30e9\u30d5\u30c8\u3067{item}\u3092\u4f5c\u3063\u3066\u304f\u3060\u3055\u3044\u3002",
          stationDescription: "\u8a2d\u5099\u3092\u4f7f\u3063\u3066{item}\u3092\u4f5c\u308c\u308b\u72b6\u614b\u306b\u3057\u3066\u304f\u3060\u3055\u3044\u3002",
        },
        build: {
          title: "{building}\u3092\u8a2d\u7f6e\u3057\u3088\u3046",
          description: "\u5efa\u7bc9\u30e1\u30cb\u30e5\u30fc\u304b\u3089{building}\u306e\u5efa\u7bc9\u4e88\u5b9a\u5730\u3092\u7f6e\u3044\u3066\u304f\u3060\u3055\u3044\u3002",
        },
        completeBuild: {
          title: "{building}\u3092\u5b8c\u6210\u3055\u305b\u3088\u3046",
          description: "\u30cf\u30f3\u30de\u30fc\u3092\u6301\u3063\u3066{building}\u306e\u5efa\u7bc9\u4f5c\u696d\u3092\u9032\u3081\u3001\u5b8c\u6210\u3055\u305b\u3066\u304f\u3060\u3055\u3044\u3002",
        },
        villagerCount: {
          title: "\u6751\u4eba\u3092\u5897\u3084\u305d\u3046",
          description: "\u6751\u4eba\u30e1\u30cb\u30e5\u30fc\u3092\u958b\u3044\u3066\u3001\u6751\u4eba\u3092{count}\u4eba\u4ee5\u4e0a\u306b\u3057\u3066\u304f\u3060\u3055\u3044\u3002",
        },
        stockRule: {
          title: "{item}\u306e\u5728\u5eab\u76ee\u6a19\u3092\u6709\u52b9\u5316\u3057\u3088\u3046",
          description: "\u5009\u5eab\u3092\u958b\u3044\u3066{item}\u306e\u5728\u5eab\u8a2d\u5b9a\u3092 ON \u306b\u3057\u3066\u304f\u3060\u3055\u3044\u3002",
        },
        stationAssign: {
          title: "{station}\u306b\u6751\u4eba\u3092\u5272\u308a\u5f53\u3066\u3088\u3046",
          description: "{station}\u3092\u958b\u3044\u3066\u62c5\u5f53\u306e\u6751\u4eba\u3092\u8ffd\u52a0\u3057\u3066\u304f\u3060\u3055\u3044\u3002",
        },
        stationCraftEntry: {
          title: "{station}\u306b{recipe}\u3092\u767b\u9332\u3057\u3088\u3046",
          description: "{station}\u3092\u958b\u3044\u3066\u30af\u30e9\u30d5\u30c8\u30ea\u30b9\u30c8\u306b{recipe}\u3092\u8ffd\u52a0\u3057\u3066\u304f\u3060\u3055\u3044\u3002",
        },
      },
    },
  },
  en: {
    tutorial: {
      panel: {
        title: "Tutorial",
        stepCounter: "Step {current} / {total}",
        inProgress: "In Progress",
        complete: "Complete",
        requirements: "Requirements",
        highlightHint: "Look for the highlighted target.",
        completeTitle: "Tutorial complete",
        completeDescription: "The village foundation is ready. You can now expand it freely.",
      },
      requirement: {
        villagers: "Villagers",
        stationWorkers: "{station} workers",
      },
      step: {
        gather: {
          title: "Collect {item}",
          description: "Pick up {item} from the field.",
        },
        craft: {
          title: "Craft {item}",
          handDescription: "Open the player and use hand craft to make {item}.",
          stationDescription: "Set up production so {item} can be crafted at a facility.",
        },
        build: {
          title: "Place {building}",
          description: "Open the build menu and place a {building} construction site.",
        },
        completeBuild: {
          title: "Finish {building}",
          description: "Hold a hammer and work on {building} until construction is complete.",
        },
        villagerCount: {
          title: "Add more villagers",
          description: "Open villager management and bring the village to at least {count} villagers.",
        },
        stockRule: {
          title: "Enable a stock target for {item}",
          description: "Open storage and turn ON the stock rule for {item}.",
        },
        stationAssign: {
          title: "Assign a villager to {station}",
          description: "Open {station} and assign a villager to it.",
        },
        stationCraftEntry: {
          title: "Register {recipe} at {station}",
          description: "Open {station} and add {recipe} to its craft list.",
        },
      },
    },
  },
};
