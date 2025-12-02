import { jsxDEV } from "react/jsx-dev-runtime";
import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { Engine } from "./engine.js";
import { OBJECT_CATALOG, TEXTURES } from "./data.js";
import { Hammer, Undo, Redo, Grid, Eraser, Move, Palette, Box, Layers, Mountain, X, Menu, Loader2, ArrowUp, ArrowDown } from "lucide-react";
const TOOLS = {
  SELECT: "select",
  WALL: "wall",
  FLOOR: "floor",
  OBJECT: "object",
  TERRAIN: "terrain"
};
function App() {
  const mountRef = useRef(null);
  const engineRef = useRef(null);
  const [activeTool, setActiveTool] = useState(TOOLS.SELECT);
  const [subTool, setSubTool] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [generatedTextures, setGeneratedTextures] = useState({});
  const [loadingTexture, setLoadingTexture] = useState(false);
  const [wallStart, setWallStart] = useState(null);
  useEffect(() => {
    if (!mountRef.current) return;
    const engine = new Engine(mountRef.current, (data) => {
      setSelectedItem(data);
      if (data) setActiveTool(TOOLS.SELECT);
    });
    engineRef.current = engine;
    return () => engine.dispose();
  }, []);
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    if (activeTool === TOOLS.SELECT) {
      engine.setTool(null);
      return;
    }
    engine.deselect();
    setSelectedItem(null);
    engine.setTool((point, isClick) => {
      const gridX = Math.round(point.x * 2) / 2;
      const gridZ = Math.round(point.z * 2) / 2;
      if (activeTool === TOOLS.WALL) {
        if (!isClick) {
          if (wallStart) {
            const end = { x: gridX, z: gridZ };
            if (Math.abs(end.x - wallStart.x) > Math.abs(end.z - wallStart.z)) {
              end.z = wallStart.z;
            } else {
              end.x = wallStart.x;
            }
            engine.updateWallPreview(wallStart, end, true);
          } else {
            engine.updateWallPreview({ x: gridX, z: gridZ }, { x: gridX, z: gridZ }, true);
          }
        } else {
          if (!wallStart) {
            setWallStart({ x: gridX, z: gridZ });
          } else {
            const end = { x: gridX, z: gridZ };
            if (Math.abs(end.x - wallStart.x) > Math.abs(end.z - wallStart.z)) {
              end.z = wallStart.z;
            } else {
              end.x = wallStart.x;
            }
            if (Math.hypot(end.x - wallStart.x, end.z - wallStart.z) > 0.5) {
              engine.addWall({
                id: Date.now(),
                start: wallStart,
                end,
                height: 2.7
              });
            }
            setWallStart(null);
            engine.previewGroup.clear();
          }
        }
      } else if (activeTool === TOOLS.FLOOR) {
        const floorX = Math.floor(point.x);
        const floorZ = Math.floor(point.z);
        if (isClick) {
          engine.addFloor({
            id: Date.now(),
            x: floorX,
            z: floorZ,
            texture: generatedTextures["floor_oak"]?.url
            // Default
          });
        }
      } else if (activeTool === TOOLS.OBJECT && subTool) {
        const ghostId = "ghost";
        if (isClick) {
          engine.addObject({
            id: Date.now(),
            x: gridX,
            z: gridZ,
            rotation: 0,
            catalogData: subTool
          });
        }
      } else if (activeTool === TOOLS.TERRAIN && subTool) {
        if (isClick) {
          engine.modifyTerrain(point.x, point.z, 2, 0.5, subTool);
        }
      }
    });
  }, [activeTool, subTool, wallStart, generatedTextures]);
  const handleGenerateTexture = async (texDef) => {
    if (generatedTextures[texDef.id]) return;
    setLoadingTexture(true);
    try {
      const result = await websim.imageGen({
        prompt: texDef.prompt,
        aspect_ratio: "1:1",
        width: 512,
        height: 512
      });
      setGeneratedTextures((prev) => ({ ...prev, [texDef.id]: result }));
      if (selectedItem) {
        const engine = engineRef.current;
        const obj = engine.scene.getObjectByProperty("uuid", engine.selectedObject.uuid);
        if (obj) {
          let target = obj;
          while (target.parent && target.parent.userData && !target.parent.userData.id) target = target.parent;
          engine.updateMaterialTexture(target, result.url);
        }
      }
    } catch (e) {
      console.error(e);
    }
    setLoadingTexture(false);
  };
  const deleteSelected = () => {
    if (selectedItem) {
      engineRef.current.removeObject(selectedItem.id);
      setSelectedItem(null);
    }
  };
  const rotateSelected = () => {
    if (selectedItem && engineRef.current.selectedObject) {
      const obj = engineRef.current.selectedObject;
      obj.rotation.y += Math.PI / 2;
    }
  };
  return /* @__PURE__ */ jsxDEV("div", { className: "w-full h-full font-sans text-gray-800", children: [
    /* @__PURE__ */ jsxDEV("div", { ref: mountRef, id: "canvas-container" }, void 0, false, {
      fileName: "<stdin>",
      lineNumber: 200,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "ui-layer absolute top-0 left-0 w-full p-4 flex justify-between items-start", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "bg-white/90 backdrop-blur rounded-lg shadow-lg p-2 flex gap-2 ui-element", children: [
        /* @__PURE__ */ jsxDEV("button", { className: "p-2 hover:bg-gray-100 rounded", title: "Undo", children: /* @__PURE__ */ jsxDEV(Undo, { size: 20 }, void 0, false, {
          fileName: "<stdin>",
          lineNumber: 205,
          columnNumber: 74
        }, this) }, void 0, false, {
          fileName: "<stdin>",
          lineNumber: 205,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("button", { className: "p-2 hover:bg-gray-100 rounded", title: "Redo", children: /* @__PURE__ */ jsxDEV(Redo, { size: 20 }, void 0, false, {
          fileName: "<stdin>",
          lineNumber: 206,
          columnNumber: 74
        }, this) }, void 0, false, {
          fileName: "<stdin>",
          lineNumber: 206,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "w-px bg-gray-300 mx-1" }, void 0, false, {
          fileName: "<stdin>",
          lineNumber: 207,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("button", { className: "p-2 hover:bg-gray-100 rounded", title: "Toggle Grid", children: /* @__PURE__ */ jsxDEV(Grid, { size: 20 }, void 0, false, {
          fileName: "<stdin>",
          lineNumber: 208,
          columnNumber: 81
        }, this) }, void 0, false, {
          fileName: "<stdin>",
          lineNumber: 208,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "<stdin>",
        lineNumber: 204,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "bg-white/90 backdrop-blur rounded-lg shadow-lg p-2 ui-element", children: /* @__PURE__ */ jsxDEV("h1", { className: "font-bold text-sm", children: "SimsBuilder Web" }, void 0, false, {
        fileName: "<stdin>",
        lineNumber: 212,
        columnNumber: 11
      }, this) }, void 0, false, {
        fileName: "<stdin>",
        lineNumber: 211,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "<stdin>",
      lineNumber: 203,
      columnNumber: 7
    }, this),
    selectedItem && /* @__PURE__ */ jsxDEV("div", { className: "ui-layer absolute bottom-24 left-0 w-full flex justify-center pointer-events-none", children: /* @__PURE__ */ jsxDEV("div", { className: "ui-element bg-white shadow-xl rounded-lg p-4 flex gap-4 items-center animate-in slide-in-from-bottom-5 fade-in duration-200", children: [
      /* @__PURE__ */ jsxDEV("div", { children: [
        /* @__PURE__ */ jsxDEV("p", { className: "text-xs text-gray-500 uppercase font-bold", children: selectedItem.type }, void 0, false, {
          fileName: "<stdin>",
          lineNumber: 221,
          columnNumber: 16
        }, this),
        /* @__PURE__ */ jsxDEV("p", { className: "font-semibold text-sm", children: [
          "Item #",
          selectedItem.id.toString().slice(-4)
        ] }, void 0, true, {
          fileName: "<stdin>",
          lineNumber: 222,
          columnNumber: 16
        }, this)
      ] }, void 0, true, {
        fileName: "<stdin>",
        lineNumber: 220,
        columnNumber: 14
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "h-8 w-px bg-gray-200" }, void 0, false, {
        fileName: "<stdin>",
        lineNumber: 224,
        columnNumber: 14
      }, this),
      selectedItem.type === "object" && /* @__PURE__ */ jsxDEV("button", { onClick: rotateSelected, className: "p-2 bg-gray-100 rounded hover:bg-gray-200", children: /* @__PURE__ */ jsxDEV(Move, { size: 16 }, void 0, false, {
        fileName: "<stdin>",
        lineNumber: 226,
        columnNumber: 103
      }, this) }, void 0, false, {
        fileName: "<stdin>",
        lineNumber: 226,
        columnNumber: 16
      }, this),
      /* @__PURE__ */ jsxDEV("button", { onClick: deleteSelected, className: "p-2 bg-red-100 text-red-600 rounded hover:bg-red-200", children: /* @__PURE__ */ jsxDEV(Eraser, { size: 16 }, void 0, false, {
        fileName: "<stdin>",
        lineNumber: 228,
        columnNumber: 112
      }, this) }, void 0, false, {
        fileName: "<stdin>",
        lineNumber: 228,
        columnNumber: 14
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "flex gap-1 ml-2", children: (selectedItem.type === "wall" ? TEXTURES.walls : selectedItem.type === "floor" ? TEXTURES.floors : []).map((tex) => /* @__PURE__ */ jsxDEV(
        "button",
        {
          onClick: () => handleGenerateTexture(tex),
          className: "w-8 h-8 rounded border overflow-hidden relative",
          title: tex.name,
          children: [
            generatedTextures[tex.id] ? /* @__PURE__ */ jsxDEV("img", { src: generatedTextures[tex.id].url, className: "w-full h-full object-cover" }, void 0, false, {
              fileName: "<stdin>",
              lineNumber: 241,
              columnNumber: 25
            }, this) : /* @__PURE__ */ jsxDEV("div", { className: "w-full h-full bg-gray-200 flex items-center justify-center text-[8px]", children: "Gen" }, void 0, false, {
              fileName: "<stdin>",
              lineNumber: 243,
              columnNumber: 25
            }, this),
            loadingTexture && /* @__PURE__ */ jsxDEV("div", { className: "absolute inset-0 bg-white/50 flex items-center justify-center", children: /* @__PURE__ */ jsxDEV(Loader2, { className: "animate-spin w-3 h-3" }, void 0, false, {
              fileName: "<stdin>",
              lineNumber: 245,
              columnNumber: 121
            }, this) }, void 0, false, {
              fileName: "<stdin>",
              lineNumber: 245,
              columnNumber: 42
            }, this)
          ]
        },
        tex.id,
        true,
        {
          fileName: "<stdin>",
          lineNumber: 234,
          columnNumber: 21
        },
        this
      )) }, void 0, false, {
        fileName: "<stdin>",
        lineNumber: 231,
        columnNumber: 14
      }, this)
    ] }, void 0, true, {
      fileName: "<stdin>",
      lineNumber: 219,
      columnNumber: 11
    }, this) }, void 0, false, {
      fileName: "<stdin>",
      lineNumber: 218,
      columnNumber: 9
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: `ui-layer absolute bottom-0 left-0 w-full transition-transform duration-300 transform ${isMenuOpen ? "translate-y-0" : "translate-y-[calc(100%-80px)]"} md:translate-y-0`, children: /* @__PURE__ */ jsxDEV("div", { className: "ui-element bg-white shadow-[0_-5px_20px_rgba(0,0,0,0.1)] rounded-t-2xl md:rounded-none md:h-48 h-[60vh] flex flex-col", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "md:hidden w-full flex justify-center p-2", onClick: () => setIsMenuOpen(!isMenuOpen), children: /* @__PURE__ */ jsxDEV("div", { className: "w-12 h-1.5 bg-gray-300 rounded-full" }, void 0, false, {
        fileName: "<stdin>",
        lineNumber: 259,
        columnNumber: 14
      }, this) }, void 0, false, {
        fileName: "<stdin>",
        lineNumber: 258,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "flex justify-around md:justify-center md:gap-8 border-b p-2 overflow-x-auto no-scrollbar", children: [
        /* @__PURE__ */ jsxDEV(ToolTab, { icon: Move, label: "Select", active: activeTool === TOOLS.SELECT, onClick: () => setActiveTool(TOOLS.SELECT) }, void 0, false, {
          fileName: "<stdin>",
          lineNumber: 264,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV(ToolTab, { icon: Layers, label: "Walls", active: activeTool === TOOLS.WALL, onClick: () => {
          setActiveTool(TOOLS.WALL);
          setWallStart(null);
        } }, void 0, false, {
          fileName: "<stdin>",
          lineNumber: 265,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV(ToolTab, { icon: Grid, label: "Floors", active: activeTool === TOOLS.FLOOR, onClick: () => setActiveTool(TOOLS.FLOOR) }, void 0, false, {
          fileName: "<stdin>",
          lineNumber: 266,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV(ToolTab, { icon: Box, label: "Objects", active: activeTool === TOOLS.OBJECT, onClick: () => {
          setActiveTool(TOOLS.OBJECT);
          setIsMenuOpen(true);
        } }, void 0, false, {
          fileName: "<stdin>",
          lineNumber: 267,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV(ToolTab, { icon: Mountain, label: "Terrain", active: activeTool === TOOLS.TERRAIN, onClick: () => setActiveTool(TOOLS.TERRAIN) }, void 0, false, {
          fileName: "<stdin>",
          lineNumber: 268,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "<stdin>",
        lineNumber: 263,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "flex-1 overflow-y-auto p-4 bg-gray-50 no-scrollbar pb-20 md:pb-4", children: [
        activeTool === TOOLS.SELECT && /* @__PURE__ */ jsxDEV("div", { className: "text-center text-gray-500 mt-4", children: [
          /* @__PURE__ */ jsxDEV("p", { children: "Tap an object to select it." }, void 0, false, {
            fileName: "<stdin>",
            lineNumber: 276,
            columnNumber: 17
          }, this),
          /* @__PURE__ */ jsxDEV("p", { className: "text-xs mt-2", children: "One finger to rotate \u2022 Two fingers to pan/zoom" }, void 0, false, {
            fileName: "<stdin>",
            lineNumber: 277,
            columnNumber: 17
          }, this)
        ] }, void 0, true, {
          fileName: "<stdin>",
          lineNumber: 275,
          columnNumber: 15
        }, this),
        activeTool === TOOLS.WALL && /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col gap-4 items-center", children: [
          /* @__PURE__ */ jsxDEV("div", { className: "text-sm text-gray-600", children: "Click start point, then end point." }, void 0, false, {
            fileName: "<stdin>",
            lineNumber: 283,
            columnNumber: 17
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "flex gap-2", children: TEXTURES.walls.map((t) => /* @__PURE__ */ jsxDEV(TextureButton, { texture: t, generated: generatedTextures, onGenerate: handleGenerateTexture, loading: loadingTexture }, t.id, false, {
            fileName: "<stdin>",
            lineNumber: 286,
            columnNumber: 22
          }, this)) }, void 0, false, {
            fileName: "<stdin>",
            lineNumber: 284,
            columnNumber: 17
          }, this)
        ] }, void 0, true, {
          fileName: "<stdin>",
          lineNumber: 282,
          columnNumber: 15
        }, this),
        activeTool === TOOLS.OBJECT && /* @__PURE__ */ jsxDEV("div", { className: "grid grid-cols-4 md:grid-cols-6 gap-4", children: Object.entries(OBJECT_CATALOG).map(([category, items]) => /* @__PURE__ */ jsxDEV(React.Fragment, { children: [
          /* @__PURE__ */ jsxDEV("div", { className: "col-span-full font-bold text-xs uppercase text-gray-400 mt-2", children: category }, void 0, false, {
            fileName: "<stdin>",
            lineNumber: 296,
            columnNumber: 24
          }, this),
          items.map((item) => /* @__PURE__ */ jsxDEV(
            "button",
            {
              onClick: () => setSubTool(item),
              className: `flex flex-col items-center p-2 rounded border ${subTool?.id === item.id ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white"}`,
              children: [
                /* @__PURE__ */ jsxDEV("div", { className: "w-10 h-10 bg-gray-200 mb-1 rounded flex items-center justify-center", children: "\u{1FA91}" }, void 0, false, {
                  fileName: "<stdin>",
                  lineNumber: 303,
                  columnNumber: 28
                }, this),
                /* @__PURE__ */ jsxDEV("span", { className: "text-xs text-center leading-tight", children: item.name }, void 0, false, {
                  fileName: "<stdin>",
                  lineNumber: 304,
                  columnNumber: 28
                }, this)
              ]
            },
            item.id,
            true,
            {
              fileName: "<stdin>",
              lineNumber: 298,
              columnNumber: 26
            },
            this
          ))
        ] }, category, true, {
          fileName: "<stdin>",
          lineNumber: 295,
          columnNumber: 21
        }, this)) }, void 0, false, {
          fileName: "<stdin>",
          lineNumber: 293,
          columnNumber: 15
        }, this),
        activeTool === TOOLS.TERRAIN && /* @__PURE__ */ jsxDEV("div", { className: "flex justify-center gap-4", children: [
          /* @__PURE__ */ jsxDEV("button", { onClick: () => setSubTool("raise"), className: `p-4 rounded border ${subTool === "raise" ? "bg-blue-100 border-blue-500" : "bg-white"}`, children: [
            /* @__PURE__ */ jsxDEV(ArrowUp, {}, void 0, false, {
              fileName: "<stdin>",
              lineNumber: 315,
              columnNumber: 19
            }, this),
            " ",
            /* @__PURE__ */ jsxDEV("span", { className: "block text-xs mt-1", children: "Raise" }, void 0, false, {
              fileName: "<stdin>",
              lineNumber: 315,
              columnNumber: 31
            }, this)
          ] }, void 0, true, {
            fileName: "<stdin>",
            lineNumber: 314,
            columnNumber: 17
          }, this),
          /* @__PURE__ */ jsxDEV("button", { onClick: () => setSubTool("lower"), className: `p-4 rounded border ${subTool === "lower" ? "bg-blue-100 border-blue-500" : "bg-white"}`, children: [
            /* @__PURE__ */ jsxDEV(ArrowDown, {}, void 0, false, {
              fileName: "<stdin>",
              lineNumber: 318,
              columnNumber: 19
            }, this),
            " ",
            /* @__PURE__ */ jsxDEV("span", { className: "block text-xs mt-1", children: "Lower" }, void 0, false, {
              fileName: "<stdin>",
              lineNumber: 318,
              columnNumber: 33
            }, this)
          ] }, void 0, true, {
            fileName: "<stdin>",
            lineNumber: 317,
            columnNumber: 17
          }, this)
        ] }, void 0, true, {
          fileName: "<stdin>",
          lineNumber: 313,
          columnNumber: 15
        }, this)
      ] }, void 0, true, {
        fileName: "<stdin>",
        lineNumber: 272,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "<stdin>",
      lineNumber: 255,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "<stdin>",
      lineNumber: 254,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "<stdin>",
    lineNumber: 198,
    columnNumber: 5
  }, this);
}
const ToolTab = ({ icon: Icon, label, active, onClick }) => /* @__PURE__ */ jsxDEV(
  "button",
  {
    onClick,
    className: `flex flex-col items-center p-2 min-w-[64px] rounded transition-colors ${active ? "text-blue-600" : "text-gray-500 hover:text-gray-800"}`,
    children: [
      /* @__PURE__ */ jsxDEV(Icon, { size: 24 }, void 0, false, {
        fileName: "<stdin>",
        lineNumber: 335,
        columnNumber: 5
      }),
      /* @__PURE__ */ jsxDEV("span", { className: "text-xs mt-1 font-medium", children: label }, void 0, false, {
        fileName: "<stdin>",
        lineNumber: 336,
        columnNumber: 5
      })
    ]
  },
  void 0,
  true,
  {
    fileName: "<stdin>",
    lineNumber: 331,
    columnNumber: 3
  }
);
const TextureButton = ({ texture, generated, onGenerate, loading }) => /* @__PURE__ */ jsxDEV(
  "button",
  {
    onClick: () => onGenerate(texture),
    className: "w-16 h-16 rounded-lg border-2 border-gray-200 overflow-hidden relative group",
    children: [
      generated[texture.id] ? /* @__PURE__ */ jsxDEV("img", { src: generated[texture.id].url, className: "w-full h-full object-cover" }, void 0, false, {
        fileName: "<stdin>",
        lineNumber: 346,
        columnNumber: 8
      }) : /* @__PURE__ */ jsxDEV("div", { className: "w-full h-full bg-gray-100 flex flex-col items-center justify-center", children: [
        /* @__PURE__ */ jsxDEV(Palette, { size: 16, className: "text-gray-400" }, void 0, false, {
          fileName: "<stdin>",
          lineNumber: 349,
          columnNumber: 10
        }),
        /* @__PURE__ */ jsxDEV("span", { className: "text-[8px] text-gray-400 mt-1", children: "Generate" }, void 0, false, {
          fileName: "<stdin>",
          lineNumber: 350,
          columnNumber: 10
        })
      ] }, void 0, true, {
        fileName: "<stdin>",
        lineNumber: 348,
        columnNumber: 8
      }),
      loading && /* @__PURE__ */ jsxDEV("div", { className: "absolute inset-0 bg-white/50 flex items-center justify-center", children: /* @__PURE__ */ jsxDEV(Loader2, { className: "animate-spin" }, void 0, false, {
        fileName: "<stdin>",
        lineNumber: 353,
        columnNumber: 96
      }) }, void 0, false, {
        fileName: "<stdin>",
        lineNumber: 353,
        columnNumber: 17
      }),
      /* @__PURE__ */ jsxDEV("div", { className: "absolute bottom-0 left-0 w-full bg-black/50 text-white text-[8px] p-0.5 truncate text-center", children: texture.name }, void 0, false, {
        fileName: "<stdin>",
        lineNumber: 354,
        columnNumber: 5
      })
    ]
  },
  void 0,
  true,
  {
    fileName: "<stdin>",
    lineNumber: 341,
    columnNumber: 3
  }
);
const root = createRoot(document.getElementById("root"));
root.render(/* @__PURE__ */ jsxDEV(App, {}, void 0, false, {
  fileName: "<stdin>",
  lineNumber: 361,
  columnNumber: 13
}));
