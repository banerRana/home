---
title: "A Post About MyGFA"
---
Lately, we've been collaborating with some hip biologists who do something called [pangenomics][], which is like regular genomics but cooler. In regular genomics, you sequence each organism's genome by aligning it to a *reference genome* that somebody previously assembled [at great cost][denovo]. In a sense, the traditional view models all of us as variations of [a Platonic ideal of *Homo sapiens*][human-reference]. Pangenomicists instead try to directly model the variation among an entire population of different organisms. This all-to-all comparison, they tell us, is the key to understanding a population's diversity and revealing subtleties that are undetectable with the traditional approach.

A [pangenome variation graph][vg] is the data structure these folks work with.
It models the genetic sequences that multiple individuals have in common and how they differ.
The graph's vertices are little snippets of DNA sequences, and each individual is a walk through these vertices:
if you concatenate all the little DNA sequences along a given walk, you get the full genome sequence for the individual.
Here's a picture of a [tiny fake graph I made][tiny.gfa], drawn by [the vg tool][vg] made by some of our collaborators:

<img src="{{site.base}}/media/flatgfa/tiny.svg" class="img-responsive">

Hilariously, vg picked the 🎷 and 🕌 emojis to represent the two walks in the graph, i.e., the two individual organisms in our little population.
(And [GraphViz][] has made something of a mess of things, which isn't unusual.)
You can see the 🎷 genome going through segments 1, 2, and 4;
🕌 also takes a detour through segment 3, which is the nucleotide sequence TTG.
Just to make things a little more fun, these walks pass through each segment *directionally:*
either forward, yielding the DNA sequence you see written in the node, or backward, yielding the sequence's [reverse complement][revcomp].
That's what's going on with segment 4 here: both paths traverse it backward.

The pangenome folks have a standard file format for these variation graphs:
[Graphical Fragment Assembly (GFA)][gfa].
GFA is a text format, and it looks like this:

```
S	1	CAAATAAG
S	2	AAATTTTCTGGAGTTCTAT
S	3	TTG
S	4	CCAACTCTCTG
P	x	1+,2+,4-	*
P	y	1+,2+,3+,4-	*
L	1	+	2	+	0M
L	2	+	4	-	0M
L	2	+	3	+	0M
L	3	+	4	-	0M
```

Each line in the GFA file above declares some part of this variation graph.
The `S` lines are *segments* (vertices);
`P` is for *path* (which are those per-individual walks);
`L` is for *link* (a directed edge where a path is allowed to traverse).
Our graph has 4 segments and 2 paths through those segments, named `x` and `y`.
(Also known as 🎷 and 🕌 in the picture above.)
There are also [CIGAR alignment strings][cigar] like `0M` and `*`, but these don't matter much for this post.

The most interesting part is probably those comma-separated lists of steps in the path lines, like `1+,2+,4-` for the `x` path.
Each step has the name of a segment (declared in an `S` line) and a direction (`+` or `-`).
All our segments' names here happen to be numbers, but the GFA text format doesn't actually require that.

[denovo]: https://en.wikipedia.org/wiki/De_novo_sequence_assemblers
[pangenomics]: https://en.wikipedia.org/wiki/Pan-genome
[human-reference]: https://en.wikipedia.org/wiki/Reference_genome#Human_reference_genome
[vg]: https://github.com/vgteam/vg
[graphviz]: https://graphviz.org
[gfa]: https://github.com/GFA-spec/GFA-spec
[tiny.gfa]: {{site.base}}/media/flatgfa/tiny.gfa
[revcomp]: http://genewarrior.com/docs/exp_revcomp.jsp
[cigar]: https://jef.works/blog/2017/03/28/CIGAR-strings-for-dummies/

## A Slow, Obvious Data Model

How would you represent the fundamental data model that GFA files encode?
You can find [dozens][gfapy] [of][gfagraphs] [libraries][pygfa] [for][gfatools] [parsing][gfago] [and][gfakluge] [manipulating][rs-gfa] [GFAs][gfa_rust] on GitHub or wherever, but those are all trying to be *useful:*
they're optimized to be fast, or specialized for a specific kind of analysis.
To understand what's actually going on in GFA files, a genomically naive hacker like me needs something much dumber: the most straightforward possible in-memory data model that can parse and pretty-print GFA text.

[Anshuman Mohan][anshuman] and I made a tiny Python library, [mygfa][], that tries to play this explanatory role.
Here are pretty much all the [important data structures][mygfa-docs]:

<img src="{{site.base}}/media/flatgfa/mygfa.svg" class="img-responsive">

A `Graph` object holds Python lists and dictionaries to contain all the segments, paths, and links in a GFA file.
Maybe the only semi-interesting class here is `Handle`, which is nothing more than a pair of a segment---referenced by name---and an orientation (`+` or `-` in the GFA syntax).

The mygfa data model is ridiculously inefficient.
That's intentional!
We want to reflect exactly what's going on in the GFA file in the most obvious, straightforward way possible.
That means there are strings and hash tables all over the place, including where it seems kind of silly to use them.
For example, because handles refer to segments by name, you have to look up the actual segment in `graph.segments`.
Like, if you want to print out the DNA sequence for a link's vertices, you'd do this:

```py
print(graph.segments[graph.links[i].from_.name].seq)
print(graph.segments[graph.links[i].to_.name].seq)
```

While mygfa is the wrong tool for the job for practical pangenomics computations,
we hope it's useful for situations where clarity matters a lot and scale matters less:
learning about the domain,
exploratory design phases that come before high-performance implementations,
and writing [reference implementations][slow-odgi] for "real" pangenomics software.

[gfapy]: https://github.com/ggonnella/gfapy
[gfagraphs]: https://github.com/Tharos-ux/gfagraphs
[pygfa]: https://github.com/AlgoLab/pygfa
[gfatools]: https://github.com/lh3/gfatools
[gfago]: https://github.com/will-rowe/gfa
[gfakluge]: https://github.com/edawson/gfakluge
[rs-gfa]: https://github.com/chfi/rs-gfa
[gfa_rust]: https://github.com/ban-m/gfa_rust
[mygfa]: https://github.com/cucapra/pollen/tree/main/mygfa
[mygfa-docs]: https://cucapra.github.io/pollen/mygfa/
[anshuman]: https://www.cs.cornell.edu/~amohan/
[slow-odgi]: https://github.com/cucapra/pollen/tree/main/slow_odgi
