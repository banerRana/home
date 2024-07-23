---
title: "Bril: An Intermediate Language for Teaching Compilers"
---
When I started a new [PhD-level compilers course][cs6120] a few years ago,
I thought it was important to use a "hands-on" structure.
There is a big difference between understanding an algorithm on a whiteboard and implementing it, inevitably running into bugs when your implementation encounters real programs.
At the same time, I wanted students to get started quickly, without learning the overwhelming APIs that come with industrial-strength compilers.

I created [Bril][], the Big Red Intermediate Language, to support the class's implementation projects.
Bril isn't very interesting from a compiler engineering perspective, but
I think it's pretty good for the specific use case of teaching compilers classes.
Here's a factorial program:

```bril
@main(input: int) {
  res: int = call @fact input;
  print res;
}

@fact(n: int): int {
  one: int = const 1;
  cond: bool = le n one;
  br cond .then .else;
.then:
  ret one;
.else:
  decr: int = sub n one;
  rec: int = call @fact decr;
  prod: int = mul n rec;
  ret prod;
}
```

Bril is the only compiler IL I know of that is specifically designed for education.
Focusing on teaching means that Bril prioritizes these goals:

* It is fast to get started working with the IL.
* It is easy to mix and match components that work with the IL, including things that fellow students write.
* The semantics are simple, without too many distractions.
* The syntax is ruthlessly regular.

Bril is different from other ILs because it ranks those goals above other, more typical goals:
code size, compiler speed, and performance of the generated code.

Aside from that invasion of priorities, Bril looks a lot like any other modern compiler IL.
It's an assembly-like, typed, instruction-based, [ANF][] language.
There's a quote from [why the lucky stiff][why] where he introduces [Camping][], the original web microframework, as "a little white blood cell in the vein of Rails."
If LLVM is an entire circulatory system, Bril is a single blood cell.

[camping]: https://camping.github.io/camping.io/
[why]: https://en.wikipedia.org/wiki/Why_the_lucky_stiff
[bril]: https://capra.cs.cornell.edu/bril/
[cs6120]: https://www.cs.cornell.edu/courses/cs6120/2023fa/
[anf]: https://en.wikipedia.org/wiki/A-normal_form

## Bril is JSON

Bril programs are JSON documents.
Here's how students get started working with Bril code using Python:

```py
import json
import sys
prog = json.load(sys.stdin)
```

I'm obviously being a little silly here.
But seriously, the JSON-as-syntax idea is in service of the *fast to get started* and *easy to mix and match components* goals above.
I wanted Bril to do these things:

* **Let students use any programming language they want.**
  I wanted my compilers course to be accessible to lots of PhD students, including people with only tangential interest in compilers.
  Letting them use the languages they're comfortable with is a great way to avoid any ramp-up phase with some "realistic" compiler implementation language, whatever you think that is.
* **No framework is required to get started.**
  For the first offering of CS 6120, no libraries existed, and I needed to run the course somehow.
  Beyond that practical matter, this constraint is valuable as a complexity limiter:
  students can get started with simple stuff without learning any APIs.
  These days, Bril does come with libraries that are great for avoiding JSON-handling frustrations when you scale up:
  for [Rust][bril-rs], [OCaml][bril-ocaml], [Swift][bril-swift], and [TypeScript][bril-ts].
  But the fact that they're not really *required* keeps the onramps gentle.
* **Compose small pieces with Unix pipelines.**
  You can wire up Bril workflows with shell pipelines, like `cat code.json | my_opt | my_friends_opt | brilck`.
  I want students in CS 6120 to freely share code with each other and to borrow bits of functionality I wrote.
  For a PhD-level class, this trust-based "open-source" course setup makes way more sense to me than a typical undergrad-style approach to academic integrity.
  Piping JSON from one tool to the next is a great vehicle for sharing.

So, JSON is the canonical form for Bril code.
Here's a complete Bril program:

```json
{
  "functions": [{
    "name": "main",
    "args": [],
    "instrs": [
      { "op": "const", "type": "int", "dest": "v0", "value": 1 },
      { "op": "const", "type": "int", "dest": "v1", "value": 2 },
      { "op": "add", "type": "int", "dest": "v2", "args": ["v0", "v1"] },
      { "op": "print", "args": ["v2"] }
    ]
  }]
}
```

This program has one function, `main`, with no arguments and 4 instructions:
two `const` instructions, an `add`, and a `print`.

Even though Bril is JSON, it also has a text form.
I will, however, die on the following hill:
**the text form is a second-class convenience**, with no warranty of any kind, express or implied.
The text syntax exists solely to cater to our foibles as humans for whom reading JSON directly is just kinda annoying.
Bril itself is the JSON format you see above.
But as a concession to our foibles, among Bril's many tools are a [parser and pretty-printer][bril-txt].
Here's the text form of the program above:

```bril
@main {
  v0: int = const 1;
  v1: int = const 2;
  v2: int = add v0 v1;
  print v2;
}
```

As a consequence, working with Bril means typing commands like this a lot:

```
$ bril2json < program.bril | do_something | bril2txt
```

It can get annoying to constantly need to convert to and from JSON,
and it's wasteful to serialize and deserialize programs at each stage in a long pipeline.
But the trade-off is that the Bril ecosystem comprises a large number of small pieces, loosely joined and infinitely remixable on the command line.

[bril-ocaml]: https://github.com/sampsyo/bril/tree/main/bril-ocaml
[bril-ts]: https://github.com/sampsyo/bril/tree/main/bril-ts
[bril-swift]: https://github.com/sampsyo/bril/tree/main/bril-swift
[bril-rs]: https://github.com/sampsyo/bril/tree/main/bril-rs
[bril-txt]: https://github.com/sampsyo/bril/blob/main/bril-txt/briltxt.py

## Language Design: Good, Bad, and Ugly

There are a few design decisions in the language itself that reflect Bril's education-over-practicality priorities.
For instance, `print` is a [core opcode][core] in Bril; I don't think this would be a good idea in most compilers, but it makes it really easy to write small examples.

Another quirk is that Bril is *extremely* [A-normal form][anf], to the point that constants always have to go in their own instructions and get their own names.
To increment an integer, for example, you can't do this:

```bril
incr: int = add n 1;
```

Instead, Bril code is full of one-off constant variables, like this:

```bril
one: int = const 1;
incr: int = add n one;
```

This more-ANF-than-ANF approach to constants is verbose to the point of silliness.
But it simplifies the way you write some basic IL traversals because you don't have to worry about whether operands come from variables or constants.
For many use cases, you get to handle constants the same way you do any other instruction.
For teaching, I think the regularity is worth the silliness.

Bril is extensible, in a loosey-goosey way.
The string-heavy JSON syntax means it's trivial to add new opcodes and data types.
Beyond the [core language][core], there are "official" extensions for [manually managed memory][memory], [floating-point numbers][float], a funky form of [speculation][spec] I use for teaching JIT principles, [module imports][import], and [characters][char].
While a *laissez faire* approach to extensions has worked so far, it's also a mess:
there's no systematic way to tell which extensions a given program uses or which language features a given tool supports.
[A more explicit approach to extensibility][38] would make the growing ecosystem easier to manage.

Finally, Bril does not require not SSA.
There is [an SSA form][ssa] that includes a `phi` instruction, but the language itself has mutable variables.
I wouldn't recommend this strategy for any other IL, but it's helpful for teaching for three big reasons:

1. I want students to feel the pain of working with non-SSA programs before the course introduces SSA. This frustration can help motivate why SSA is the modern consensus.
2. The course includes a task where students [implement into-SSA and out-of-SSA transformations][ssa-task].
3. It's really easy to generate Bril code from frontend languages that have mutable variables. The alternative would be LLVM's [mem2reg][]/"just put all the frontend variables in memory" trick, but Bril avoids building memory into the core language for simplicity.

Unfortunately, this aftermarket SSA retrofit has been a huge headache.
It has caused [persistent problems with undefinedness][108] and [classic correctness problems when translating out of SSA][330].
I think my original design is fundamentally flawed;
it was a mistake to treat `phi` semantically as "just another instruction" instead of a more invasive change to the language.
Bril's SSA form needs a full rework, probably including an actual language extension along the lines of [MLIR's basic block arguments][block-args].
It has been an interesting lesson for me that SSA comes with subtle design implications that are difficult to retrofit onto an existing mutation-oriented IL.

[core]: https://capra.cs.cornell.edu/bril/lang/core.html
[ssa-task]: https://www.cs.cornell.edu/courses/cs6120/2023fa/lesson/6/#tasks
[memory]: https://capra.cs.cornell.edu/bril/lang/memory.html
[float]: https://capra.cs.cornell.edu/bril/lang/float.html
[spec]: https://capra.cs.cornell.edu/bril/lang/spec.html
[import]: https://capra.cs.cornell.edu/bril/lang/import.html
[char]: https://capra.cs.cornell.edu/bril/lang/char.html
[ssa]: https://capra.cs.cornell.edu/bril/lang/ssa.html
[38]: https://github.com/sampsyo/bril/issues/38
[mem2reg]: https://llvm.org/doxygen/Mem2Reg_8cpp_source.html
[block-args]: https://mlir.llvm.org/docs/Rationale/Rationale/#block-arguments-vs-phi-nodes
[108]: https://github.com/sampsyo/bril/issues/108
[330]: https://github.com/sampsyo/bril/issues/330

## The Bril Ecosystem

<img src="{{site.base}}/media/bril/ecosystem.svg"
    class="img-responsive bonw" style="max-width: 450px;">

I cobbled together the first version of Bril in a hurry in the weeks before the fall 2019 semester began.
Since then, via the "open-source class" nature of [CS 6120][cs6120], students have contributed a host of tools for working with the language.
The diagram above shows a sampling of what is in [the monorepo][bril-gh];
empty boxes are things I made and shaded boxes are things students contributed.
Someone also built a snazzy [web playground][playground] that I find super impressive.
You can find many more random tools by [searching on GitHub][gh-search].

Most of the language extensions I mentioned were contributed by CS 6120 students.
In the run-up to the first semester, for instance, I was low on time and left memory, function calls, and floating-point numbers as "exercises for the reader."
You can read 2019 blog posts [by Drew Zagieboylo & Ryan Doenges about the memory extension][memory-blog],
[by Alexa VanHattum & Gregory Yauney about designing function calls][func-blog],
and [by Dietrich Geisler about floats][float-blog].
Laziness can pay off.

Please [get in touch][toot] if you're using Bril for something unconventional!
I love learning about the weird places it has gone.

[playground]: https://agentcooper.github.io/bril-playground/
[bril-gh]: https://github.com/sampsyo/bril
[gh-search]: https://github.com/search?q=bril+compiler&type=repositories
[toot]: https://discuss.systems/@adrian
[float-blog]: https://www.cs.cornell.edu/courses/cs6120/2019fa/blog/floats-static-arrays/
[func-blog]: https://www.cs.cornell.edu/courses/cs6120/2019fa/blog/function-calls/
[memory-blog]: https://www.cs.cornell.edu/courses/cs6120/2019fa/blog/manually-managed-memory/
