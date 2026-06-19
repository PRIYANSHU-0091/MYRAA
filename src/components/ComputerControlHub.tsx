import React, { useState, useEffect, useRef } from "react";
import { 
  X, 
  Terminal, 
  Folder, 
  File, 
  Monitor, 
  Play, 
  Volume2, 
  Settings, 
  Search, 
  ShieldAlert, 
  Check, 
  Cpu, 
  RefreshCw, 
  Compass, 
  FileCode, 
  ArrowLeft, 
  ArrowRight, 
  Plus, 
  Trash2, 
  Edit3, 
  AlertOctagon, 
  Clock, 
  Sun,
  Power,
  ChevronRight,
  ChevronDown,
  Download,
  Copy,
  FolderPlus,
  PlayCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ComputerControlHubProps {
  onClose: () => void;
  audioSession: any; // MyraaAudioSession instance for volume/speed/reboot controls
  actionTrigger?: {
    action: string;
    args: any;
    id: string; // callId
    onComplete: (output: any) => void;
  } | null;
  isEnabled: boolean; // Computer Control enabled or disabled state
}

interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  size?: number;
  children?: FileNode[];
}

interface TaskStep {
  id: string;
  name: string;
  status: "pending" | "running" | "completed" | "failed";
  timestamp: string;
}

export const ComputerControlHub: React.FC<ComputerControlHubProps> = ({
  onClose,
  audioSession,
  actionTrigger,
  isEnabled
}) => {
  // System states
  const [activeWindow, setActiveWindow] = useState<string | null>("file_explorer");
  const [minimizedWindows, setMinimizedWindows] = useState<string[]>([]);
  const [taskHistory, setTaskHistory] = useState<TaskStep[]>([]);
  const [activeTaskDescription, setActiveTaskDescription] = useState<string>("System Idle");
  const [permissionRequest, setPermissionRequest] = useState<{
    id: string;
    action: string;
    args: any;
    timer: number;
    resolver: (approved: boolean) => void;
  } | null>(null);

  // Virtual settings
  const [systemVolume, setSystemVolume] = useState<number>(80);
  const [screenBrightness, setScreenBrightness] = useState<number>(90);
  const [speakingSpeed, setSpeakingSpeed] = useState<number>(1.0);
  const [powerState, setPowerState] = useState<"on" | "rebooting" | "sleeping">("on");

  // Virtual cursor simulation
  const [virtualCursor, setVirtualCursor] = useState<{ x: number; y: number; isVisible: boolean; clickTrigger: boolean }>({
    x: 200,
    y: 200,
    isVisible: false,
    clickTrigger: false
  });

  // Browser App States
  const [browserUrl, setBrowserUrl] = useState<string>("https://google.com");
  const [browserHistory, setBrowserHistory] = useState<string[]>(["https://google.com"]);
  const [browserIndex, setBrowserIndex] = useState<number>(0);
  const [isBrowserLoading, setIsBrowserLoading] = useState<boolean>(false);

  // File Explorer States
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [isEditingFile, setIsEditingFile] = useState<boolean>(false);
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [newFileName, setNewFileName] = useState<string>("");
  const [isCreatingFile, setIsCreatingFile] = useState<boolean>(false);

  // Terminal States
  const [terminalCommand, setTerminalCommand] = useState<string>("");
  const [terminalHistory, setTerminalHistory] = useState<string[]>([]);
  const [isTerminalLoading, setIsTerminalLoading] = useState<boolean>(false);

  // Canvas Game (Retro Snake) States
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gameState, setGameState] = useState<"idle" | "playing" | "game_over">("idle");
  const [gameScore, setGameScore] = useState<number>(0);

  // Countdown timer ref for permission auto-deny
  const permissionTimerRef = useRef<any>(null);

  // Load backend file tree on initiation
  const fetchFileTree = async () => {
    try {
      const res = await fetch("/api/computer/files");
      if (res.ok) {
        const tree = await res.json();
        setFileTree(tree);
      }
    } catch (err) {
      console.error("[Computer] Failed fetching tree:", err);
    }
  };

  useEffect(() => {
    fetchFileTree();
  }, []);

  // Set speaking rate and volume on audio Session
  useEffect(() => {
    if (audioSession) {
      audioSession.setVolume(systemVolume / 100);
    }
  }, [systemVolume, audioSession]);

  useEffect(() => {
    if (audioSession) {
      audioSession.setPlaybackRate(speakingSpeed);
    }
  }, [speakingSpeed, audioSession]);

  // Handle incoming Gemini Live action execution autonomously
  useEffect(() => {
    if (!actionTrigger || !isEnabled) return;
    const { action, args, id, onComplete } = actionTrigger;

    const executeActionSequence = async () => {
      // 1. Log beginning step
      const stepId = Math.random().toString();
      const timestamp = new Date().toLocaleTimeString();
      const startLog: TaskStep = {
        id: stepId,
        name: `Agent command: ${action.replace("_", " ")}`,
        status: "running",
        timestamp
      };
      setTaskHistory(prev => [startLog, ...prev]);
      setActiveTaskDescription(`Executing: ${action.replace("_", " ")}...`);

      // 2. Virtual cursor feedback movement based on window coordinates
      setVirtualCursor({ x: 300, y: 400, isVisible: true, clickTrigger: false });
      setTimeout(() => {
        setVirtualCursor(prev => ({ ...prev, x: 450, y: 250 }));
      }, 600);
      setTimeout(() => {
        setVirtualCursor(prev => ({ ...prev, clickTrigger: true }));
      }, 1200);
      setTimeout(() => {
        setVirtualCursor(prev => ({ ...prev, clickTrigger: false }));
      }, 1400);

      try {
        // High risk checks requiring permission dialog confirmation
        const isSensitive = ["run_script", "delete_file", "write_file", "change_setting"].includes(action);
        if (isSensitive) {
          const approved = await requestUserPermission(action, args, id);
          if (!approved) {
            setTaskHistory(prev => prev.map(s => s.id === stepId ? { ...s, status: "failed" } : s));
            setActiveTaskDescription("Command Denied by User");
            onComplete({ error: `Command security permission refused by the desktop operator.` });
            setVirtualCursor(prev => ({ ...prev, isVisible: false }));
            return;
          }
        }

        // Action dispatcher mapping
        switch (action) {
          case "open_app": {
            const { appName } = args;
            const normalized = appName?.toLowerCase() || "";
            let windowId = "";
            if (normalized.includes("explorer") || normalized.includes("file")) windowId = "file_explorer";
            else if (normalized.includes("terminal") || normalized.includes("cmd") || normalized.includes("shell")) windowId = "terminal";
            else if (normalized.includes("browser") || normalized.includes("web") || normalized.includes("google")) windowId = "web_browser";
            else if (normalized.includes("setting") || normalized.includes("volume")) windowId = "settings";
            else if (normalized.includes("game") || normalized.includes("snake") || normalized.includes("software")) windowId = "retro_arcade";
            
            if (windowId) {
              setActiveWindow(windowId);
              setMinimizedWindows(prev => prev.filter(w => w !== windowId));
              onComplete({ output: { result: `App '${appName}' successfully brought to focus on holographic pipeline.` } });
            } else {
              onComplete({ error: `Application '${appName}' is not in virtual OS registry.` });
            }
            break;
          }

          case "close_app": {
            const { appName } = args;
            setActiveWindow(null);
            onComplete({ output: { result: `Closed application window: ${appName}.` } });
            break;
          }

          case "open_browser": {
            const { url } = args;
            setActiveWindow("web_browser");
            let cleanUrl = url;
            if (!url.startsWith("http")) cleanUrl = "https://" + url;
            setBrowserUrl(cleanUrl);
            setBrowserHistory(prev => [...prev.slice(0, browserIndex + 1), cleanUrl]);
            setBrowserIndex(prev => prev + 1);
            onComplete({ output: { result: `Opened web portal to page: ${cleanUrl}. Checking web contents.` } });
            break;
          }

          case "list_files": {
            await fetchFileTree();
            onComplete({ output: { fileCount: fileTree.length, message: "Directory listing completed. Updated file list visualizer." } });
            break;
          }

          case "read_file": {
            const { relativePath } = args;
            const res = await fetch("/api/computer/files/read", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ relativePath })
            });
            if (res.ok) {
              const fileData = await res.json();
              setSelectedFile(fileData);
              setFileContent(fileData.content);
              setActiveWindow("file_explorer");
              onComplete({ output: { content: fileData.content, bytes: fileData.size } });
            } else {
              onComplete({ error: "File could not be found or read inside sandbox." });
            }
            break;
          }

          case "write_file": {
            const { relativePath, content } = args;
            const res = await fetch("/api/computer/files/write", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ relativePath, content })
            });
            if (res.ok) {
              await fetchFileTree();
              onComplete({ output: { result: `Successfully wrote content to ${relativePath}.` } });
            } else {
              onComplete({ error: "Failed listing file details or writing filesystem sector." });
            }
            break;
          }

          case "create_folder": {
            const { relativePath } = args;
            const res = await fetch("/api/computer/files/create-folder", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ relativePath })
            });
            if (res.ok) {
              await fetchFileTree();
              onComplete({ output: { result: `Directory '${relativePath}' spawned inside project workspace root.` } });
            } else {
              onComplete({ error: "Workspace folder could not be created." });
            }
            break;
          }

          case "delete_file": {
            const { relativePath } = args;
            const res = await fetch("/api/computer/files/delete", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ relativePath })
            });
            if (res.ok) {
              await fetchFileTree();
              onComplete({ output: { result: `Target '${relativePath}' deleted successfully.` } });
            } else {
              onComplete({ error: "Failed to erase selected resource path." });
            }
            break;
          }

          case "rename_file": {
            const { oldPath, newPath } = args;
            const res = await fetch("/api/computer/files/rename", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ oldPath, newPath })
            });
            if (res.ok) {
              await fetchFileTree();
              onComplete({ output: { result: `Successfully renamed ${oldPath} to ${newPath}.` } });
            } else {
              onComplete({ error: "Could not rename selected relative workspace item." });
            }
            break;
          }

          case "search_files": {
            const { query } = args;
            const res = await fetch(`/api/computer/files/search?query=${encodeURIComponent(query)}`);
            if (res.ok) {
              const data = await res.json();
              setSearchResults(data);
              setActiveWindow("file_explorer");
              onComplete({ output: { matches: data } });
            } else {
              onComplete({ error: "Disk search indexing error." });
            }
            break;
          }

          case "simulate_mouse": {
            const { x, y, click, targetElement } = args;
            onComplete({ output: { result: `Mouse simulated successfully. Mouse pointer relocated to coordinates (${x}, ${y}) and ${click ? "clicked" : "hovered"} on target element ${targetElement || 'none'}.` } });
            break;
          }

          case "simulate_keyboard": {
            const { textToType } = args;
            if (activeWindow === "terminal") {
              setTerminalCommand(textToType);
            } else if (activeWindow === "file_explorer" && isEditingFile) {
              setFileContent(prev => prev + textToType);
            }
            onComplete({ output: { wordCount: textToType.length, result: "Keystrokes successfully injected." } });
            break;
          }

          case "take_screenshot": {
            // Emulate visual grab from DOM layout
            onComplete({ output: { imageBase64: "Simulated JPEG Buffer successfully rendered during live stream." } });
            break;
          }

          case "change_setting": {
            const { settingName, value } = args;
            if (settingName === "volume") setSystemVolume(Math.min(100, Math.max(0, value)));
            else if (settingName === "brightness") setScreenBrightness(Math.min(100, Math.max(0, value)));
            else if (settingName === "speakingSpeed") setSpeakingSpeed(Math.min(2.0, Math.max(0.5, value)));
            onComplete({ output: { result: `Setting '${settingName}' successfully configured to ${value}.` } });
            break;
          }

          case "run_script": {
            const { command } = args;
            setActiveWindow("terminal");
            setTerminalHistory(prev => [...prev, `$ ${command}`]);
            setIsTerminalLoading(true);
            const res = await fetch("/api/computer/shell", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ command })
            });
            setIsTerminalLoading(false);
            if (res.ok) {
              const shellData = await res.json();
              if (shellData.stdout) setTerminalHistory(prev => [...prev, shellData.stdout]);
              if (shellData.stderr) setTerminalHistory(prev => [...prev, `Error: ${shellData.stderr}`]);
              onComplete({ output: shellData });
            } else {
              onComplete({ error: "Failed to execute linter or shell scripts inside sandbox environment." });
            }
            break;
          }

          default:
            onComplete({ error: `Holographic Computer Command '${action}' is unsupported.` });
        }

        // Mark completion success
        setTaskHistory(prev => prev.map(s => s.id === stepId ? { ...s, status: "completed" } : s));
        setActiveTaskDescription("System Idle");
      } catch (err: any) {
        setTaskHistory(prev => prev.map(s => s.id === stepId ? { ...s, status: "failed" } : s));
        setActiveTaskDescription(`Error: ${err.message || err}`);
        onComplete({ error: `Platform Exception: ${err.message}` });
      } finally {
        setTimeout(() => {
          setVirtualCursor(prev => ({ ...prev, isVisible: false }));
        }, 1200);
      }
    };

    executeActionSequence();
  }, [actionTrigger, isEnabled]);

  // Request Security confirmation overlay
  const requestUserPermission = (action: string, args: any, callId: string): Promise<boolean> => {
    return new Promise((resolve) => {
      // Clear legacy timer
      if (permissionTimerRef.current) clearInterval(permissionTimerRef.current);

      setPermissionRequest({
        id: callId,
        action,
        args,
        timer: 30, // 30s Security Auto-Deny threshold
        resolver: resolve
      });
    });
  };

  // Decrement security timer loop
  useEffect(() => {
    if (!permissionRequest) return;
    permissionTimerRef.current = setInterval(() => {
      setPermissionRequest(prev => {
        if (!prev) return null;
        if (prev.timer <= 1) {
          clearInterval(permissionTimerRef.current);
          prev.resolver(false); // Auto reject
          return null;
        }
        return { ...prev, timer: prev.timer - 1 };
      });
    }, 1000);

    return () => {
      if (permissionTimerRef.current) clearInterval(permissionTimerRef.current);
    };
  }, [permissionRequest]);

  // Emergency stop handler
  const handleEmergencyStop = () => {
    if (permissionRequest) {
      permissionRequest.resolver(false);
      setPermissionRequest(null);
    }
    // Wipe activity queue
    setTaskHistory([]);
    setActiveTaskDescription("SYSTEM ABORT - Emergency shutdown sequence instantiated.");
    setTerminalHistory(prev => [...prev, "🚨 EMERGENCY STOP EVENT RECEIVED. ABORTING ALL PROCESSES."]);
    // Clear cursor
    setVirtualCursor({ x: 200, y: 200, isVisible: false, clickTrigger: false });
  };

  // Safe manual file explorer actions
  const handleFileClick = async (node: FileNode) => {
    if (node.isDirectory) {
      setOpenFolders(prev => ({ ...prev, [node.path]: !prev[node.path] }));
    } else {
      try {
        const res = await fetch("/api/computer/files/read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ relativePath: node.path })
        });
        if (res.ok) {
          const detailed = await res.json();
          setSelectedFile(detailed);
          setFileContent(detailed.content);
          setIsEditingFile(false);
        }
      } catch (err) {
        console.error("Read fault:", err);
      }
    }
  };

  const handleManualWriteFile = async () => {
    if (!selectedFile) return;
    try {
      const res = await fetch("/api/computer/files/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ relativePath: selectedFile.path, content: fileContent })
      });
      if (res.ok) {
        setIsEditingFile(false);
        fetchFileTree();
        setTerminalHistory(prev => [...prev, `[File Explorer] Document saved successfully: ${selectedFile.path}`]);
      }
    } catch {}
  };

  const handleManualCreateFile = async () => {
    if (!newFileName.trim()) return;
    try {
      const res = await fetch("/api/computer/files/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ relativePath: newFileName, content: "// Born inside sandbox OS" })
      });
      if (res.ok) {
        setNewFileName("");
        setIsCreatingFile(false);
        fetchFileTree();
      }
    } catch {}
  };

  const handleManualDelete = async (path: string) => {
    const confirmation = window.confirm(`Permanently erase '${path}' from container disk workspace?`);
    if (!confirmation) return;
    try {
      const res = await fetch("/api/computer/files/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ relativePath: path })
      });
      if (res.ok) {
        setSelectedFile(null);
        fetchFileTree();
      }
    } catch {}
  };

  // Safe manual terminal command
  const handleTerminalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!terminalCommand.trim()) return;

    const cmd = terminalCommand;
    setTerminalHistory(prev => [...prev, `$ ${cmd}`]);
    setTerminalCommand("");
    setIsTerminalLoading(true);

    try {
      const res = await fetch("/api/computer/shell", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: cmd })
      });
      setIsTerminalLoading(false);
      if (res.ok) {
        const d = await res.json();
        if (d.stdout) setTerminalHistory(prev => [...prev, d.stdout]);
        if (d.stderr) setTerminalHistory(prev => [...prev, `Error: ${d.stderr}`]);
      }
    } catch {
      setIsTerminalLoading(false);
      setTerminalHistory(prev => [...prev, "Critical connection error: console shell timed out."]);
    }
  };

  // Retro Canvas Retro Matrix Snake Game implementation
  useEffect(() => {
    if (activeWindow !== "retro_arcade" || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let gameInterval: any = null;
    let snake = [{ x: 10, y: 10 }];
    let food = { x: 5, y: 5 };
    let dx = 1;
    let dy = 0;
    const gridCount = 20;

    const spawnFood = () => {
      food = {
        x: Math.floor(Math.random() * gridCount),
        y: Math.floor(Math.random() * gridCount)
      };
    };

    const drawGrid = () => {
      ctx.fillStyle = "#020617";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Cyber Matrix line accents
      ctx.strokeStyle = "rgba(168,85,247,0.05)";
      ctx.lineWidth = 1;
      const w = canvas.width / gridCount;
      for (let i = 0; i <= gridCount; i++) {
        ctx.beginPath();
        ctx.moveTo(i * w, 0);
        ctx.lineTo(i * w, canvas.height);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, i * w);
        ctx.lineTo(canvas.width, i * w);
        ctx.stroke();
      }
    };

    const updateGame = () => {
      const w = canvas.width / gridCount;
      
      // Update head position
      const head = { x: snake[0].x + dx, y: snake[0].y + dy };

      // Wall wrapping
      if (head.x < 0) head.x = gridCount - 1;
      if (head.x >= gridCount) head.x = 0;
      if (head.y < 0) head.y = gridCount - 1;
      if (head.y >= gridCount) head.y = 0;

      // Self collision check
      if (snake.some(segment => segment.x === head.x && segment.y === head.y)) {
        setGameState("game_over");
        clearInterval(gameInterval);
        return;
      }

      snake.unshift(head);

      // Check food intake
      if (head.x === food.x && head.y === food.y) {
        setGameScore(prev => prev + 10);
        spawnFood();
      } else {
        snake.pop();
      }

      drawGrid();

      // Draw cyber food
      ctx.fillStyle = "#f59e0b";
      ctx.beginPath();
      ctx.arc(food.x * w + w / 2, food.y * w + w / 2, w / 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Draw matrix snake
      ctx.fillStyle = "#8b5cf6";
      snake.forEach((seg, index) => {
        ctx.fillStyle = index === 0 ? "#a78bfa" : "#7c3aed";
        ctx.fillRect(seg.x * w + 1, seg.y * w + 1, w - 2, w - 2);
      });
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== "playing") return;
      if (e.key === "ArrowUp" && dy !== 1) { dx = 0; dy = -1; }
      else if (e.key === "ArrowDown" && dy !== -1) { dx = 0; dy = 1; }
      else if (e.key === "ArrowLeft" && dx !== 1) { dx = -1; dy = 0; }
      else if (e.key === "ArrowRight" && dx !== -1) { dx = 1; dy = 0; }
    };

    window.addEventListener("keydown", handleKeyDown);

    if (gameState === "playing") {
      spawnFood();
      gameInterval = setInterval(updateGame, 100);
    } else {
      drawGrid();
    }

    return () => {
      clearInterval(gameInterval);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeWindow, gameState]);

  // Recursively render directory tree elements
  const renderTreeNodes = (nodes: FileNode[]) => {
    return nodes.map((node) => {
      const isOpen = openFolders[node.path];
      const isSelected = selectedFile?.path === node.path;
      return (
        <div key={node.path} className="pl-3.5 select-none text-left">
          <div 
            onClick={() => handleFileClick(node)}
            className={`flex items-center gap-2 py-1 px-2.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
              isSelected 
                ? "bg-purple-950/40 border border-purple-500/30 text-purple-200" 
                : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
            }`}
          >
            {node.isDirectory ? (
              <>
                {isOpen ? <ChevronDown size={13} className="text-purple-400" /> : <ChevronRight size={13} className="text-slate-500" />}
                <Folder size={13} className="text-indigo-400 fill-indigo-400/20" />
              </>
            ) : (
              <>
                <span className="w-3.5" />
                <FileCode size={13} className="text-amber-400" />
              </>
            )}
            <span className="truncate">{node.name}</span>
          </div>
          {node.isDirectory && isOpen && node.children && (
            <div className="border-l border-white/5 ml-2.5 my-0.5">
              {renderTreeNodes(node.children)}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div 
      id="myraa-computer-controller-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl animate-fade-in text-left select-none"
    >
      {/* Screen Brightness Overlay simulation */}
      <div 
        className="absolute inset-0 pointer-events-none z-50 transition-colors duration-300 pointer-events-none" 
        style={{ backgroundColor: `rgba(0, 0, 0, ${Math.max(0, (100 - screenBrightness) / 100 * 0.85)})` }}
      />

      <div className="relative w-full max-w-6xl h-[92vh] flex flex-col md:flex-row rounded-3xl border border-white/10 bg-slate-900/85 shadow-[0_0_90px_rgba(139,92,246,0.25)] overflow-hidden">
        
        {/* Virtual Cursor Renderer */}
        {virtualCursor.isVisible && (
          <motion.div
            animate={{ x: virtualCursor.x, y: virtualCursor.y }}
            transition={{ type: "spring", damping: 30, stiffness: 120 }}
            className="absolute pointer-events-none z-50 flex flex-col"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]">
              <path d="M4 2L20 18L14 19.5L10 23L4 2Z" fill="#a78bfa" stroke="#fff" strokeWidth="2" />
            </svg>
            <span className="text-[8px] font-mono bg-purple-950/90 text-white rounded px-1 -mt-1 ml-4 border border-purple-500/30">Myraa</span>
            {virtualCursor.clickTrigger && (
              <span className="absolute animate-ping h-8 w-8 -top-2.5 -left-2.5 rounded-full bg-purple-400 opacity-75" />
            )}
          </motion.div>
        )}

        {/* --- LEFT NAVIGATION DOCK --- */}
        <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-white/10 bg-slate-950/65 flex flex-col justify-between">
          <div className="p-4.5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-1.5">
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-center">
                  <Cpu size={16} className="text-purple-400 animate-spin-slow" />
                </div>
                <div>
                  <h3 className="text-sm font-bold font-mono tracking-widest text-slate-100 uppercase">SYS_CONTROL</h3>
                  <span className="text-[9px] text-[#8b5cf6] font-mono tracking-wider font-extrabold uppercase">Sandbox Core</span>
                </div>
              </div>
              <button 
                onClick={handleEmergencyStop}
                className="px-2.5 py-1.5 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-300 hover:bg-rose-500 hover:text-white transition duration-200 flex items-center gap-1 cursor-pointer font-bold text-[10px] font-mono animate-pulse"
                title="Immediate Halt All Agent Operations"
              >
                <AlertOctagon size={11} /> HALT
              </button>
            </div>

            {/* Task Sequencer & Activity Log */}
            <div className="space-y-2">
              <span className="text-[10px] font-mono text-slate-400 tracking-wider uppercase font-extrabold block">Running Agent Actions</span>
              <div className="p-3 border border-white/5 bg-slate-900/60 rounded-xl">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${activeTaskDescription === "System Idle" ? "bg-slate-400" : "bg-purple-400 animate-ping"}`} />
                  <span className="text-xs font-mono font-medium text-slate-300 truncate">{activeTaskDescription}</span>
                </div>
              </div>

              <div className="h-44 overflow-y-auto pr-1 scrollbar-thin scrollbar-track-transparent flex flex-col gap-1.5">
                {taskHistory.length === 0 ? (
                  <div className="text-center py-6 text-slate-500 font-mono text-[10px] uppercase">
                    Queue clear. Trigger computer actions via voice stream!
                  </div>
                ) : (
                  taskHistory.map((step) => (
                    <div key={step.id} className="p-2 border border-white/5 bg-slate-900/30 rounded-lg flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          step.status === "completed" ? "bg-emerald-500" :
                          step.status === "failed" ? "bg-rose-500" :
                          "bg-purple-400 animate-pulse"
                        }`} />
                        <span className="text-[10px] font-mono text-slate-300 truncate">{step.name}</span>
                      </div>
                      <span className="text-[8px] text-slate-500 font-mono">{step.timestamp}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Quick Stats Foot */}
          <div className="p-4 border-t border-white/5 bg-slate-950/80 space-y-2.5 font-mono text-[10px]">
            <div className="flex justify-between text-slate-500">
              <span>CONTROLLER STATUS:</span>
              <span className={isEnabled ? "text-emerald-400 font-bold" : "text-slate-500"}>{isEnabled ? "ACTIVE" : "STANDBY"}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>SECURE LEVEL:</span>
              <span className="text-indigo-400 font-bold">CONTAINER SANDBOX</span>
            </div>
            <button 
              onClick={onClose}
              className="w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-850 border border-white/10 text-slate-300 hover:text-white transition cursor-pointer text-xs justify-center font-bold font-sans flex items-center gap-1"
            >
              <X size={12} /> CLOSE CONTROL HUB
            </button>
          </div>
        </div>

        {/* --- RIGHT COMPComputer OS PLATFORM SCREEN --- */}
        <div className="flex-1 flex flex-col bg-slate-950/40 relative">
          
          {/* Virtual Top Task Panel */}
          <div className="h-12 border-b border-white/10 bg-slate-950/75 flex items-center justify-between px-4 z-10">
            <div className="flex items-center gap-3">
              <span className="inline-flex w-3 h-3 rounded-full bg-indigo-500 shadow-inner" />
              <span className="text-xs font-mono font-bold tracking-wider text-slate-300 uppercase">MyraaOS Workspace v1.05</span>
            </div>

            {/* Virtual App Navigation Tabs */}
            <div className="flex items-center gap-1.5 bg-slate-900/60 border border-white/5 rounded-full p-1 max-w-sm overflow-x-auto scrollbar-none">
              {[
                { id: "file_explorer", label: "File Explorer", icon: <Folder size={11} /> },
                { id: "terminal", label: "CMD Terminal", icon: <Terminal size={11} /> },
                { id: "web_browser", label: "Web Browser", icon: <Compass size={11} /> },
                { id: "retro_arcade", label: "App Arcade", icon: <PlayCircle size={11} /> },
                { id: "settings", label: "System Settings", icon: <Settings size={11} /> }
              ].map((appTab) => {
                const isActive = activeWindow === appTab.id;
                return (
                  <button
                    key={appTab.id}
                    onClick={() => {
                      setActiveWindow(appTab.id);
                      setMinimizedWindows(prev => prev.filter(w => w !== appTab.id));
                    }}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-mono tracking-wide font-extrabold cursor-pointer transition ${
                      isActive 
                        ? "bg-purple-900/20 border border-purple-500/25 text-purple-300" 
                        : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    {appTab.icon}
                    <span>{appTab.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="text-[10px] font-mono text-slate-500 flex items-center gap-1.5">
              <Clock size={11} /> 12:44 AM
            </div>
          </div>

          {/* Core Program Workspace Port */}
          <div className="flex-1 p-5 overflow-hidden flex flex-col justify-center bg-[#06060c] relative">
            <div className="absolute inset-0 bg-radial-gradient from-purple-500/2 to-transparent pointer-events-none" />

            {/* Active Rendered Sub-Windows */}
            <AnimatePresence mode="wait">
              {activeWindow === "file_explorer" && (
                <motion.div 
                  initial={{ opacity: 0, y: 15 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, y: -15 }}
                  className="w-full h-full border border-white/10 bg-slate-900/65 backdrop-blur-md rounded-2xl overflow-hidden flex flex-col md:flex-row shadow-2xl"
                >
                  {/* Sidebar explorer panel */}
                  <div className="w-full md:w-56 border-b md:border-b-0 md:border-r border-white/5 bg-slate-950/45 p-3 flex flex-col justify-between overflow-y-auto scrollbar-thin">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center px-1">
                        <span className="text-[9px] font-mono font-bold leading-normal uppercase text-slate-500 tracking-wider">PROJECT FILESYSTEM</span>
                        <div className="flex gap-1">
                          <button 
                            onClick={() => setIsCreatingFile(!isCreatingFile)} 
                            className="p-1 rounded hover:bg-white/5 text-slate-400 hover:text-purple-400"
                            title="Spawn New File"
                          >
                            <Plus size={11} />
                          </button>
                          <button 
                            onClick={fetchFileTree} 
                            className="p-1 rounded hover:bg-white/5 text-slate-400 hover:text-purple-400"
                            title="Refresh File Trees"
                          >
                            <RefreshCw size={11} />
                          </button>
                        </div>
                      </div>

                      {isCreatingFile && (
                        <div className="p-2 border border-white/5 bg-slate-900/60 rounded-xl flex flex-col gap-1.5 animate-fade-in mb-2.5">
                          <input 
                            type="text" 
                            placeholder="relativePath (e.g. test.txt)" 
                            value={newFileName}
                            onChange={(e) => setNewFileName(e.target.value)}
                            className="w-full p-1 bg-slate-950 border border-white/10 rounded font-mono text-[10px] text-white focus:outline-none"
                          />
                          <div className="flex gap-1 justify-end">
                            <button onClick={() => setIsCreatingFile(false)} className="px-1.5 py-0.5 text-[9px] font-mono text-slate-400 rounded hover:bg-white/5">Cancel</button>
                            <button onClick={handleManualCreateFile} className="px-1.5 py-0.5 text-[9px] font-mono bg-purple-600 hover:bg-purple-500 text-white rounded">Create</button>
                          </div>
                        </div>
                      )}

                      <div className="space-y-1">
                        {renderTreeNodes(fileTree)}
                      </div>
                    </div>
                  </div>

                  {/* Document and Details inspector frame */}
                  <div className="flex-1 flex flex-col bg-slate-900/10">
                    {selectedFile ? (
                      <div className="flex-1 flex flex-col overflow-hidden">
                        {/* Selected file toolbar */}
                        <div className="p-3.5 border-b border-white/5 bg-slate-950/35 flex items-center justify-between">
                          <div className="min-w-0">
                            <h4 className="text-xs font-mono font-bold text-slate-200 truncate">{selectedFile.name}</h4>
                            <span className="text-[9px] text-slate-500 font-mono tracking-wider">Size: {selectedFile.size || 0} bytes</span>
                          </div>
                          <div className="flex gap-2">
                            {isEditingFile ? (
                              <>
                                <button
                                  onClick={handleManualWriteFile}
                                  className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 border border-emerald-500/30 text-emerald-300 hover:text-white transition duration-150 font-bold text-[10px] font-mono cursor-pointer flex items-center gap-1"
                                >
                                  <Check size={11} /> Save Changes
                                </button>
                                <button
                                  onClick={() => setIsEditingFile(false)}
                                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition text-[10px] font-mono cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => setIsEditingFile(true)}
                                  className="px-3 py-1.5 rounded-lg bg-purple-950/40 hover:bg-purple-600 border border-purple-500/30 text-purple-300 hover:text-white transition duration-150 font-bold text-[10px] font-mono cursor-pointer flex items-center gap-1"
                                >
                                  <Edit3 size={11} /> Edit Code
                                </button>
                                <button
                                  onClick={() => handleManualDelete(selectedFile.path)}
                                  className="px-3 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-600 border border-rose-500/30 text-rose-300 hover:text-white transition duration-150 font-bold text-[10px] font-mono cursor-pointer flex items-center gap-1"
                                >
                                  <Trash2 size={11} /> Delete
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Text Code Editor text area */}
                        <div className="flex-1 p-3.5 relative">
                          {isEditingFile ? (
                            <textarea
                              value={fileContent}
                              onChange={(e) => setFileContent(e.target.value)}
                              className="w-full h-full bg-slate-950/70 border border-purple-500/25 rounded-xl p-4 font-mono text-[11px] text-[#e0def4] leading-relaxed resize-none focus:outline-none focus:ring-1 focus:ring-purple-500/30 scrollbar-thin"
                            />
                          ) : (
                            <pre className="w-full h-full bg-slate-950/45 rounded-xl p-4 font-mono text-[11px] text-slate-300 leading-relaxed overflow-auto scrollbar-thin text-left border border-white/5">
                              <code>{selectedFile.content || "// File empty or unreadable text"}</code>
                            </pre>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-3">
                        <Folder size={32} className="text-slate-600 animate-pulse" />
                        <div>
                          <p className="text-xs font-mono text-slate-300 tracking-wide font-extrabold uppercase">File Inspector Port</p>
                          <p className="text-[10px] text-slate-500 font-mono tracking-wide mt-1 uppercase max-w-xs mx-auto text-center leading-relaxed">
                            Click files on the directory block to view real contents or write code edits immediately.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {activeWindow === "terminal" && (
                <motion.div 
                  initial={{ opacity: 0, y: 15 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, y: -15 }}
                  className="w-full h-full border border-white/10 bg-slate-950/90 rounded-2xl flex flex-col shadow-2xl p-4.5"
                >
                  <div className="flex justify-between items-center border-b border-white/5 pb-2.5 mb-3">
                    <div className="flex items-center gap-2">
                      <Terminal size={14} className="text-purple-400" />
                      <span className="text-xs font-mono font-bold text-slate-300 uppercase">Interactive Terminal - Sandbox Shell</span>
                    </div>
                    <span className="text-[8px] font-mono bg-indigo-950 text-indigo-400 px-1.5 py-0.5 rounded uppercase">Timeout: 15s</span>
                  </div>

                  {/* Scrolled outputs console block */}
                  <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-1.5 text-left font-mono text-[11px] text-[#a78bfa] leading-relaxed scrollbar-thin">
                    <span className="text-slate-500">Welcome to Myraa virtual developer workspace. Executing commands modifies the backend container environment.</span>
                    {terminalHistory.map((line, i) => (
                      <pre key={i} className="whitespace-pre-wrap break-all">{line}</pre>
                    ))}
                    {isTerminalLoading && (
                      <span className="text-purple-400 flex items-center gap-1.5 mt-1">
                        <RefreshCw size={11} className="animate-spin" /> Sandboxed command executing...
                      </span>
                    )}
                  </div>

                  <form onSubmit={handleTerminalSubmit} className="mt-3 flex gap-2">
                    <span className="text-[#818cf8] font-mono text-xs pt-1.5 select-none">$</span>
                    <input
                      type="text"
                      value={terminalCommand}
                      onChange={(e) => setTerminalCommand(e.target.value)}
                      placeholder="Enter command (e.g. ls, npm run lint, node -v)..."
                      className="flex-1 py-1 px-3 bg-slate-900 border border-white/10 rounded-lg text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-purple-500/40"
                    />
                    <button
                      type="submit"
                      className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 text-white font-mono text-xs transition duration-150 border border-purple-500/20"
                    >
                      EXEC
                    </button>
                  </form>
                </motion.div>
              )}

              {activeWindow === "web_browser" && (
                <motion.div 
                  initial={{ opacity: 0, y: 15 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, y: -15 }}
                  className="w-full h-full border border-white/10 bg-slate-900/45 rounded-2xl flex flex-col overflow-hidden shadow-2xl"
                >
                  <div className="p-3 border-b border-white/5 bg-slate-950/45 flex items-center gap-2.5">
                    <div className="flex gap-1">
                      <button className="p-1 rounded text-slate-500 hover:text-white" title="Go backward"><ArrowLeft size={13} /></button>
                      <button className="p-1 rounded text-slate-500 hover:text-white" title="Go forward"><ArrowRight size={13} /></button>
                      <button className="p-1 rounded text-slate-500 hover:text-white" title="Reload"><RefreshCw size={11} /></button>
                    </div>
                    <input
                      type="text"
                      value={browserUrl}
                      onChange={(e) => setBrowserUrl(e.target.value)}
                      className="flex-1 py-1 px-3 bg-slate-950 border border-white/10 rounded-lg font-mono text-[10px] text-slate-300 focus:outline-none"
                    />
                  </div>

                  <div className="flex-1 bg-slate-950 flex flex-col items-center justify-center p-8 text-center space-y-4">
                    <Compass size={40} className="text-purple-400/70" />
                    <div className="space-y-1.5 max-w-sm">
                      <h4 className="text-xs font-mono font-bold text-slate-200 uppercase">Holographic Browser Proxy Integrated</h4>
                      <p className="text-[10px] font-mono text-slate-500 leading-relaxed uppercase">
                        Active proxy running. To browse real pages inside tabs, speak to Myraa: <br />
                        <span className="text-indigo-400 font-extrabold font-mono">&ldquo;Open YouTube video of Taylor Swift&rdquo;</span>
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeWindow === "retro_arcade" && (
                <motion.div 
                  initial={{ opacity: 0, y: 15 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, y: -15 }}
                  className="w-full h-full border border-white/10 bg-slate-900/65 rounded-2xl flex flex-col shadow-2xl overflow-hidden p-4.5 items-center justify-between"
                >
                  <div className="w-full flex justify-between border-b border-white/5 pb-2 mb-2">
                    <div className="flex items-center gap-2">
                      <PlayCircle size={14} className="text-amber-400 animate-pulse" />
                      <span className="text-xs font-mono font-bold text-slate-300 uppercase">MyraaOS App Arcade - Matrix Snake</span>
                    </div>
                    <span className="text-xs font-mono text-amber-400 font-extrabold uppercase">Score: {gameScore}</span>
                  </div>

                  <div className="relative border-2 border-purple-500/20 bg-slate-950 rounded-xl overflow-hidden">
                    <canvas 
                      ref={canvasRef} 
                      width="320" 
                      height="320" 
                      className="max-w-full"
                    />
                    
                    {gameState !== "playing" && (
                      <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center p-4">
                        <span className="text-xs font-mono font-extrabold text-[#7c3aed] uppercase tracking-widest block mb-1">Myraa Game Launcher</span>
                        <p className="text-[10px] text-slate-400 font-mono tracking-wide text-center uppercase max-w-xs mb-4">
                          {gameState === "game_over" ? `🚨 SYSTEM SHUTDOWN - GAME OVER SCORE: ${gameScore}` : "Classic matrix-bound terminal retro-snake simulator"}
                        </p>
                        <button
                          onClick={() => {
                            setGameState("playing");
                            setGameScore(0);
                          }}
                          className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs font-bold transition shadow-lg shadow-purple-500/10 cursor-pointer"
                        >
                          {gameState === "game_over" ? "RE-PLAY SENSORS" : "BOOT RETRO ENGINE"}
                        </button>
                      </div>
                    )}
                  </div>

                  <span className="text-[9px] font-mono text-slate-500 tracking-wider uppercase mt-1 leading-normal text-center">
                    Use keyboard Arrow Keys (Up, Down, Left, Right) to direct navigation!
                  </span>
                </motion.div>
              )}

              {activeWindow === "settings" && (
                <motion.div 
                  initial={{ opacity: 0, y: 15 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, y: -15 }}
                  className="w-full h-full border border-white/10 bg-slate-900/65 rounded-2xl flex flex-col shadow-2xl p-5 overflow-y-auto scrollbar-thin"
                >
                  <div className="flex justify-between items-center border-b border-white/5 pb-2.5 mb-4">
                    <div className="flex items-center gap-2">
                      <Settings size={14} className="text-purple-400" />
                      <span className="text-xs font-mono font-bold text-slate-300 uppercase">System settings dashboard</span>
                    </div>
                  </div>

                  <div className="space-y-6 text-left">
                    {/* Audio configuration */}
                    <div className="space-y-2 border-b border-white/5 pb-4">
                      <h4 className="text-xs font-mono font-extrabold text-slate-200 uppercase flex items-center gap-1.5">
                        <Volume2 size={13} className="text-indigo-400" /> System Audio Volume
                      </h4>
                      <p className="text-[9px] text-slate-400 font-mono uppercase leading-normal">
                        Adjust synthesis output scalar factor to optimize raw PCM speaking logs.
                      </p>
                      <div className="flex items-center gap-4 pt-1.5">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={systemVolume}
                          onChange={(e) => setSystemVolume(Number(e.target.value))}
                          className="flex-1 accent-indigo-500 h-1 bg-slate-950 rounded-lg appearance-none"
                        />
                        <span className="text-xs font-mono text-slate-300 w-8">{systemVolume}%</span>
                      </div>
                    </div>

                    {/* Canvas brightness overlay */}
                    <div className="space-y-2 border-b border-white/5 pb-4">
                      <h4 className="text-xs font-mono font-extrabold text-slate-200 uppercase flex items-center gap-1.5">
                        <Sun size={13} className="text-amber-400" /> Holographic Brightness Level
                      </h4>
                      <p className="text-[9px] text-slate-400 font-mono uppercase leading-normal">
                        Dim computer control background overlay to secure eye-safe visuals.
                      </p>
                      <div className="flex items-center gap-4 pt-1.5">
                        <input
                          type="range"
                          min="15"
                          max="100"
                          value={screenBrightness}
                          onChange={(e) => setScreenBrightness(Number(e.target.value))}
                          className="flex-1 accent-amber-500 h-1 bg-slate-950 rounded-lg appearance-none"
                        />
                        <span className="text-xs font-mono text-slate-300 w-8">{screenBrightness}%</span>
                      </div>
                    </div>

                    {/* Speech speaks rate adjusting */}
                    <div className="space-y-2 border-b border-white/5 pb-4">
                      <h4 className="text-xs font-mono font-extrabold text-slate-200 uppercase flex items-center gap-1.5">
                        <Cpu size={13} className="text-[#a78bfa]" /> Voice Speaking Speed Rate
                      </h4>
                      <p className="text-[9px] text-slate-400 font-mono uppercase leading-normal">
                        Adjust playback clock on Little-Endian double buffers (0.5x to 2.0x).
                      </p>
                      <div className="flex items-center gap-4 pt-1.5">
                        <input
                          type="range"
                          min="50"
                          max="200"
                          value={speakingSpeed * 100}
                          onChange={(e) => setSpeakingSpeed(Number(e.target.value) / 100)}
                          className="flex-1 accent-purple-500 h-1 bg-slate-950 rounded-lg appearance-none"
                        />
                        <span className="text-xs font-mono text-[#a78bfa] w-12">{speakingSpeed.toFixed(1)}x</span>
                      </div>
                    </div>

                    {/* Power configuration */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-mono font-extrabold text-slate-200 uppercase flex items-center gap-1.5">
                        <Power size={13} className="text-rose-400" /> Sandbox State Manager
                      </h4>
                      <div className="flex gap-2 pt-1.5">
                        <button
                          onClick={() => {
                            setPowerState("rebooting");
                            setTerminalHistory(prev => [...prev, "Initiating virtual re-boot process..."]);
                            setTimeout(() => {
                              setPowerState("on");
                              setTerminalHistory([]);
                              fetchFileTree();
                            }, 1800);
                          }}
                          className="px-4 py-2 bg-slate-950 hover:bg-white/5 border border-white/10 rounded-xl text-xs font-mono text-slate-300 transition cursor-pointer flex items-center gap-1.5"
                        >
                          <RefreshCw size={11} /> REBOOT SYSTEM
                        </button>
                        <button
                          onClick={() => setPowerState("sleeping")}
                          className="px-4 py-2 bg-slate-950 hover:bg-white/5 border border-white/10 rounded-xl text-xs font-mono text-slate-300 transition cursor-pointer flex items-center gap-1.5"
                        >
                          <Power size={11} /> SUSPEND CONSOLE
                        </button>
                        {powerState === "sleeping" && (
                          <button
                            onClick={() => setPowerState("on")}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-xl text-xs font-mono text-white transition cursor-pointer"
                          >
                            WAKE UP
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* --- FLOATING MODAL ACCESS CONFIRMATION --- */}
      <AnimatePresence>
        {permissionRequest && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 15 }}
              className="w-full max-w-md p-6 rounded-3xl border border-amber-500/30 bg-slate-900 shadow-[0_0_50px_rgba(245,158,11,0.15)] space-y-5 text-center"
            >
              <div className="mx-auto w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center animate-bounce">
                <ShieldAlert size={22} className="text-amber-400" />
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] font-mono font-extrabold uppercase text-amber-500 tracking-widest select-none">SECURITY VERIFICATION PROTOCOL</span>
                <h3 className="text-sm font-bold font-mono text-slate-100 uppercase">Authorize Myraa Action?</h3>
                <p className="text-xs text-slate-400 font-sans leading-relaxed">
                  The AI Heroine companion requested permission to execute a secure system function: <br />
                  <span className="font-mono text-amber-400 font-bold block mt-1.5">&ldquo;{permissionRequest.action.replace("_", " ").toUpperCase()}&rdquo;</span>
                </p>
              </div>

              {/* Dynamic Arguments visual representation */}
              <div className="p-3 border border-white/5 bg-slate-950/70 rounded-xl text-left text-[10px] font-mono whitespace-pre-wrap break-all text-slate-400 leading-normal max-h-36 overflow-y-auto scrollbar-thin">
                <div className="text-indigo-400 border-b border-white/5 pb-1 mb-1 font-extrabold uppercase">PROPOSED SCHEME ARGUMENTS:</div>
                {JSON.stringify(permissionRequest.args, null, 2)}
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => {
                    clearInterval(permissionTimerRef.current);
                    permissionRequest.resolver(false);
                    setPermissionRequest(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-slate-300 font-mono text-xs transition duration-150 cursor-pointer text-center"
                >
                  DENY ACTION
                </button>
                <button
                  onClick={() => {
                    clearInterval(permissionTimerRef.current);
                    permissionRequest.resolver(true);
                    setPermissionRequest(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono text-xs font-bold transition duration-150 cursor-pointer shadow-lg shadow-amber-500/10 flex items-center gap-1 justify-center"
                >
                  APPROVE ({permissionRequest.timer}s)
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
