// Exports a function index, string cross-references and decompiled C for reverse-engineer.
// Args: <outDir> <budgetSeconds> [comma-separated entry addresses to decompile only]
//@category reverse-engineer
import ghidra.app.decompiler.DecompInterface;
import ghidra.app.decompiler.DecompileOptions;
import ghidra.app.decompiler.DecompileResults;
import ghidra.app.script.GhidraScript;
import ghidra.program.model.listing.Data;
import ghidra.program.model.listing.DataIterator;
import ghidra.program.model.listing.Function;
import ghidra.program.model.listing.FunctionManager;
import ghidra.program.model.symbol.Reference;
import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStreamWriter;
import java.io.PrintWriter;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

public class ExportDecompiled extends GhidraScript {

  private static String clean(String s) {
    return s.replace('\t', ' ').replace('\n', ' ').replace('\r', ' ');
  }

  private PrintWriter writer(File file, boolean append) throws Exception {
    return new PrintWriter(new OutputStreamWriter(new FileOutputStream(file, append), StandardCharsets.UTF_8));
  }

  @Override
  public void run() throws Exception {
    String[] args = getScriptArgs();
    File out = new File(args[0]);
    long budgetMs = (args.length > 1 ? Long.parseLong(args[1]) : 120) * 1000L;
    Set<String> only = null;
    if (args.length > 2 && !args[2].isEmpty()) only = new HashSet<>(Arrays.asList(args[2].split(",")));
    out.mkdirs();
    FunctionManager functions = currentProgram.getFunctionManager();
    // Functions that reference strings usually carry the logic worth reading: decompile them first.
    Set<Function> stringUsers = new HashSet<>();

    if (only == null) {
      try (PrintWriter w = writer(new File(out, "functions.tsv"), false)) {
        for (Function f : functions.getFunctions(true)) {
          w.println(f.getEntryPoint() + "\t" + clean(f.getName(true)) + "\t" + f.getBody().getNumAddresses() + "\t"
              + (f.isThunk() ? "thunk" : f.isExternal() ? "external" : "code") + "\t"
              + clean(f.getPrototypeString(false, false)));
        }
      }
      try (PrintWriter w = writer(new File(out, "strings.tsv"), false)) {
        DataIterator data = currentProgram.getListing().getDefinedData(true);
        while (data.hasNext() && !monitor.isCancelled()) {
          Data d = data.next();
          if (!d.hasStringValue()) continue;
          Set<String> users = new LinkedHashSet<>();
          for (Reference r : getReferencesTo(d.getAddress())) {
            Function f = functions.getFunctionContaining(r.getFromAddress());
            if (f != null) {
              users.add(f.getEntryPoint() + " " + clean(f.getName(true)));
              stringUsers.add(f);
            }
            if (users.size() >= 20) break;
          }
          w.println(d.getAddress() + "\t" + clean(d.getDefaultValueRepresentation()) + "\t" + String.join(", ", users));
        }
      }
    }

    DecompInterface decompiler = new DecompInterface();
    decompiler.setOptions(new DecompileOptions());
    decompiler.openProgram(currentProgram);
    List<Function> todo = new ArrayList<>();
    for (Function f : functions.getFunctions(true)) {
      if (f.isThunk() || f.isExternal()) continue;
      if (only != null && !only.contains(f.getEntryPoint().toString())) continue;
      todo.add(f);
    }
    todo.sort((a, b) -> Boolean.compare(!stringUsers.contains(a), !stringUsers.contains(b)));
    long start = System.currentTimeMillis();
    int done = 0;
    try (PrintWriter w = writer(new File(out, only == null ? "decompiled.c" : "extra.c"), only != null)) {
      for (Function f : todo) {
        if (monitor.isCancelled() || System.currentTimeMillis() - start > budgetMs) break;
        DecompileResults result = decompiler.decompileFunction(f, 30, monitor);
        w.println("// ==== " + f.getEntryPoint() + " " + clean(f.getName(true)) + " ====");
        if (result != null && result.decompileCompleted()) w.println(result.getDecompiledFunction().getC());
        else w.println("// decompilation failed: " + (result == null ? "no result" : result.getErrorMessage()));
        done++;
      }
    }
    decompiler.dispose();
    if (only == null) {
      try (PrintWriter w = writer(new File(out, "status.txt"), false)) {
        w.println(done + "/" + todo.size() + " functions decompiled in " + (System.currentTimeMillis() - start) / 1000 + " s");
      }
    }
  }
}
