# -------------------------------
# Emscripten standalone wasm (wasmtime-friendly)
# -------------------------------

include makefile-flags

.FORCE:

tags:   .FORCE
	etags *.h *.cpp # orig/*.h orig/*.cpp

clean:
	rm -rf *.o orig/*.o cql.wasm cql.html cql.js cql backup

# ---- Toolchain: force Emscripten everywhere ----
EMCC   := emcc
EMCXX  := em++
EMAR   := emar
EMRAN  := emranlib

export CC     := $(EMCC)
export CXX    := $(EMCXX)
export LD     := $(EMCXX)
export AR     := $(EMAR)
export RANLIB := $(EMRAN)

# Your project uses $(COMPILE) in the compile rule
export COMPILE := $(EMCXX)

# ---- Common flags ----
CPP_STD  ?= -std=c++17
CPP_OPT  ?= -O1
CPP_WARN ?= -w

ifeq ($(DEBUG),1)
  CPP_OPT := -O0 -g
endif

# IMPORTANT:
# Standalone/wasmtime cannot use Emscripten's JS-based C++ exceptions.
# This removes imports like env::__cxa_throw.
# Native Wasm exceptions (NOT JS-based)
EXC_FLAGS  ?= -fwasm-exceptions
RTTI_FLAGS ?=              # keep RTTI on (dynamic_cast)

# KEEP this exactly as you had it (do NOT "clean up" CPP_FLAGS; it carries include dirs/defs from included makefiles)
export CPP_FLAGS := $(CPP_STD) $(CPP_OPT) $(CPP_WARN) $(EXC_FLAGS) $(RTTI_FLAGS) $(CPP_FLAGS)

# (This block is left as-is; we will OVERRIDE memory flags AFTER origmakefile so it can't stomp them.)
export EMSCRIPTEN_LDFLAGS ?= \
  $(CPP_OPT) \
  #-sSTANDALONE_WASM=1 \
  -sINITIAL_MEMORY=256MB \
  -sALLOW_MEMORY_GROWTH=1 \
  -sMAXIMUM_MEMORY=2048MB \
  -sEXIT_RUNTIME=1 \
  $(EXC_FLAGS)

# Opti (left as-is)
export CPP_FLAGS := $(CPP_STD) $(CPP_OPT) $(CPP_WARN) $(EXC_FLAGS) $(RTTI_FLAGS) $(CPP_FLAGS)

# Output
WASM_OUT ?= cql.js

# -------------------------------
# (Your MYHEADERS and MYOBJS lists unchanged)
# -------------------------------

MYHEADERS= \
	abbreviations.h\
	abortnode.h\
	absnode.h\
	andnode.h\
	anticipatedb.h\
	anticipateentry.h\
	anticipatenode.h\
	anyvalue.h\
	arithmeticnode.h\
	assertnode.h\
	assertvariationsnode.h\
	assignnode.h\
	atomic.h\
	attack.h\
	attackarrowdirection.h\
	attacknode.h\
	bracketrange.h\
	capturetype.h\
	caseconvertnode.h\
	chaincon.h\
	chesstypes.h\
	childnode.h\
	clonevec.h\
	colortypenode.h\
	colorvaluenode.h\
	commententry.h\
	commentlevel.h\
	commentnode.h\
	commentstack.h\
	complementnode.h\
	compoundnode.h\
	concatenationnode.h\
	consecutivemovesnode.h\
	converttocolorize.h\
	converttoecho.h\
	converttoascii.h\
	converttoexternal.h\
	converttounicode.h\
	cql.h\
	cqlassert.h\
	cqlexit.h\
	cqlglobals.h\
	cqlnode.h\
	cqlthread.h\
	currentfen.h\
	currentnode.h\
	currenttransformnode.h\
	dashcon.h\
	dashnode.h\
	depthnode.h\
	descendantnode.h\
	dictionary.h\
	dictionaryaccessnode.h\
	direction.h\
	distancenode.h\
	echonode.h\
	environment.h\
	equalitynode.h\
	extremalnode.h\
	findnode.h\
	focus.h\
	focuscapturenode.h\
	focustype.h\
	fromnode.h\
	fromtonode.h\
	futurenode.h\
	gamefilterwrapper.h\
	gamesortinfo.h\
	genericequalnode.h\
	gotonode.h\
	groupnumbernode.h\
	hascommentnode.h\
	hhdbawardnode.h\
	hhdbhascooknode.h\
	hhdbkeyword.h\
	holdercon.h\
	ifnode.h\
	isboundnode.h\
	lambdacallnode.h\
	lambdavalue.h\
	lambdavariable.h\
	lastgamenumbernode.h\
	lcanode.h\
	lexer.h\
	loopnode.h\
	makesquarenode.h\
	markboard.h\
	markt.h\
	matchnode.h\
	matefunction.h\
	movebase.h\
	movelegalnode.h\
	myvector.h\
	node.h\
	nodeheaders.h\
	nonemptynode.h\
	notnode.h\
	notransformnode.h\
	numericiteratornode.h\
	numericvariable.h\
	numvalue.h\
	optionalcon.h\
	onnode.h\
	orbitelement.h\
	orbitnode.h\
	ornode.h\
	parentnode.h\
	pastmovenode.h\
	pastnode.h\
	path-atomic.h\
	path-comment.h\
	pathcon.h\
	pathcountnode.h\
	pathdebugnode.h\
	pathlastpositionnode.h\
	pathmaxnode.h\
	path-nest.h\
	pathnode.h\
	pathreferencenode.h\
	pathstartnode.h\
	path-static.h\
	path-status.h\
	pathstatus.h\
	pgnsource.h\
	pieceassignnode.h\
	pieceidnode.h\
	pieceidvariable.h\
	pieceloc.h\
	pieceloopnode.h\
	piecenamenode.h\
	piecepathnode.h\
	pinnode.h\
	pluscon.h\
	plynode.h\
	positionindexnode.h\
	positionvariable.h\
	previousdashnode.h\
	qgame.h\
	qmarkboard.h\
	qmove.h\
	qpos.h\
	range.h\
	raynode.h\
	readfilenode.h\
	regexhistory.h\
	relationalnode.h\
	removecommentnode.h\
	repeatcon.h\
	repeatinprocesscon.h\
	seqconstituent.h\
	seqdir.h\
	sequencebase.h\
	sortnode.h\
	sortvalue.h\
	sortvariable.h\
	sqrtnode.h\
	squareloopnode.h\
	squaremask.h\
	squareparitynode.h\
	squarevariable.h\
	starcon.h\
	stringasciinode.h\
	stringconverter.h\
	stringlengthnode.h\
	stringinnode.h\
	stringiteratornode.h\
	stringliteralnode.h\
	stringmatchnode.h\
	stringtointnode.h\
	stringvariable.h\
	subsetnode.h\
	substringnode.h\
	substringassignmentnode.h\
	tagbuiltinnode.h\
	tagentry.h\
	tagnode.h\
	tagsection.h\
	tagsetnode.h\
	token.h\
	tokens.h\
	tomovenode.h\
	tomovevaluenode.h\
	tonode.h\
	transform.h\
	transformvariable.h\
	truenode.h\
	typenamenode.h\
	uchar.h\
	uchar-strings.h\
	unionnode.h\
	util.h\
	util-template.h\
	unbindnode.h\
	variable.h\
	vectornode.h\
	virtualmainlinenode.h\
	whilenode.h\
	withpositionnode.h\
	writefilenode.h

MYOBJS=\
	abortnode.o\
	absnode.o\
	andnode.o\
	anticipatedb.o\
	anticipateentry.o\
	anticipatenode.o\
	anticipate-parse.o\
	anyvalue.o\
	arithmeticnode.o\
	assertnode.o\
	assignment-parse.o\
	assignnode.o\
	atomic.o\
	attack.o\
	attackarrowdirection.o\
	attacknode.o\
	betweennode.o\
	bracketrange.o\
	capturetype.o\
	caseconvertnode.o\
	chaincon.o\
	chesstypes.o\
	childnode.o\
	clone.o\
	colortransform.o\
	colortypenode.o\
	colorvaluenode.o\
	commententry.o\
	commentnode.o\
	commentstack.o\
	complementnode.o\
	composetransform.o\
	compoundnode.o\
	computeorbit.o\
	concatenationnode.o\
	consecutivemovesnode.o\
	converttocolorize.o\
	converttoecho.o\
	converttoexternal.o\
	converttoascii.o\
	converttounicode.o\
	countsquaresnode.o\
	cql.o\
	cqleassert.o\
	cqluassert.o\
	cqlexit.o\
	cqlglobals.o\
	cqlinitialize.o\
	cqlnode.o\
	cqlnodematch.o\
	cqlnode-parse.o\
	cqlthread.o\
	currentfen.o\
	currentnode.o\
	currenttransformnode.o\
	dashcon.o\
	dashnode.o\
	dash-legal-parse.o\
	dash-parse.o\
	depthnode.o\
	descendantnode.o\
	dictionary.o\
	dictionaryaccessnode.o\
	dictionaryassignnode.o\
	dictionarycountnode.o\
	dictionarydeletedictionarynode.o\
	dictionarydeleteentrynode.o\
	dictionaryiteratenode.o\
	dictionaryretrievenode.o\
	dictionary-parse.o\
	dihedraltransform.o\
	direction.o\
	directionmatch.o\
	directionparameter.o\
	distancenode.o\
	echonode.o\
	elonode.o\
	environment.o\
	equalitynode.o\
	extensionnode.o\
	extremalnode.o\
	fen.o\
	filename.o\
	findnode.o\
	focus.o\
	focuscapturenode.o\
	focustype.o\
	fromnode.o\
	fromtonode.o\
	futurenode.o\
	gamefilterwrapper.o\
	gamenumbernode.o\
	gamesortinfo.o\
	genericequalnode.o\
	gotonode.o\
	groupnumbernode.o\
	hascommentnode.o\
	hhdbawardnode.o\
	hhdbaward-parse.o\
	hhdb-cql.o\
	hhdbhascooknode.o\
	hhdbkeyword.o\
	hhdbkeyword-vars.o\
	hhdb-options-parse.o\
	hhdb-parse.o\
	hhdbaward-sort.o\
	holdercon.o\
	holderconstituent.o\
	ifnode.o\
	isboundnode.o\
	keywords.o\
	lambdacallnode.o\
	lambdamatch.o\
	lambdavalue.o\
	lambdavariable.o\
	lastgamenumbernode.o\
	lcanode.o\
	lexer.o\
	lexer-cleanup.o\
	lexer-convert.o\
	lexer-fix-whitespace.o\
	linearize.o\
	longestcommonsubstring.o\
	loopnode.o\
	makesquarenode.o\
	markboardstatic.o\
	markt.o\
	match.o\
	matchcomplexnode.o\
	matchcountnode.o\
	matchnode.o\
	matefunction.o\
	movebase.o\
	move-parse.o\
	movefuture.o\
	movepast.o\
	movelegalnode.o\
	movenumbernode.o\
	node.o\
	node-parse.o\
	nodetransform.o\
	nonemptynode.o\
	notnode.o\
	notransformnode.o\
	numbernode.o\
	numericiteratornode.o\
	numericvariable.o\
	optionalcon.o\
	orbitelement.o\
	orbitnode.o\
	origChanges.o\
	onnode.o\
	optionalconstituent.o\
	ornode.o\
	parentnode.o\
	pastmovenode.o\
	pastmove-parse.o\
	pastnode.o\
	path-atomic.o\
	path-comment.o\
	path-compute.o\
	path-compute-dashfocused.o\
	path-compute-dashunfocused.o\
	pathcountnode.o\
	pathdebugnode.o\
	pathlastpositionnode.o\
	pathmaxnode.o\
	path-nest.o\
	pathnode.o\
	path-parse.o\
	pathreferencenode.o\
	pathstartnode.o\
	pathstatus.o\
	pgnsource.o\
	piecedesignator-lex.o\
	piecedesignator-unicode.o\
	pieceassignnode.o\
	pieceidnode.o\
	pieceidvariable.o\
	pieceloc.o\
	pieceloopnode.o\
	piecenamenode.o\
	piecepathnode.o\
	pinnode.o\
	piover4transform.o\
	plynode.o\
	pluscon.o\
	plusconstituent.o\
	positionindexnode.o\
	positionvariable.o\
	powernode.o\
	previousdashnode.o\
	print.o\
	qgame.o\
	qmarkboard.o\
	qmove.o\
	qpos.o\
	qpos-visit.o\
	range.o\
	rangenode.o\
	raynode.o\
	readfilenode.o\
	regexhistory.o\
	relationalnode.o\
	removecommentnode.o\
	repeatcon.o\
	repeatconstituent.o\
	repeatinprocesscon.o\
	repeatinprocessconstituent.o\
	seqconstituent.o\
	sequencebase.o\
	sequencebase-comments.o\
	sequencenest.o\
	sequence-parse.o\
	setbase.o\
	shifttransform.o\
	sortnode.o\
	sort-parse.o\
	sortvalue.o\
	sortvariable.o\
	sqrtnode.o\
	squarecoordinatenode.o\
	squareloopnode.o\
	squaremask.o\
	squareparitynode.o\
	squarevariable.o\
	starcon.o\
	starconstituent.o\
	stringasciinode.o\
	stringconverter.o\
	stringconverter-parse.o\
	stringinnode.o\
	stringiteratornode.o\
	stringlengthnode.o\
	stringliteralnode.o\
	stringmatchnode.o\
	stringtointnode.o\
	stringvariable.o\
	subsetnode.o\
	substringnode.o\
	substringassignmentnode.o\
	piecesquareloop-parse.o\
	tagbuiltinnode.o\
	tagentry.o\
	tagnode.o\
	tagsection.o\
	tagsetnode.o\
	token.o\
	tokens.o\
	tomovenode.o\
	tomovevaluenode.o\
	tonode.o\
	toplevel.o\
	toplevel-aux.o\
	transform.o\
	transformcompare.o\
	transform_members.o\
	transform-parse.o\
	transformvariable.o\
	typenamenode.o\
	uchar.o\
	unbindnode.o\
	unionnode.o\
	util.o\
	variable.o\
	variable-parse.o\
	vectorconstituent.o\
	vectornode.o\
	version.o\
	virtualmainlinenode.o\
	whilenode.o\
	withpositionnode.o\
	writefilenode.o\
	yearnode.o

include origmakefile

# -------------------------------
# FORCE link-time memory flags AFTER origmakefile (so it cannot override them)
# Use BYTES so Emscripten definitely applies them.
# 256MB initial => 268435456
# 2GB max       => 2147483648
# -------------------------------
override EMSCRIPTEN_LDFLAGS := \
	$(CPP_OPT) \
	-sINITIAL_MEMORY=268435456 \
	-sALLOW_MEMORY_GROWTH=1 \
	-sMAXIMUM_MEMORY=2147483648 \
	-sEXIT_RUNTIME=1 \
	$(EXC_FLAGS)
export EMSCRIPTEN_LDFLAGS

# -------------------------------
# Build rules
# -------------------------------

%.o: %.cpp ${MYHEADERS}
	$(COMPILE) $(CPP_FLAGS) -o $@ -c $<

orig/tree.o:
	$(MAKE) -C ./orig origstuff \
	  CC="$(CC)" CXX="$(CXX)" LD="$(LD)" AR="$(AR)" RANLIB="$(RANLIB)" COMPILE="$(COMPILE)" \
	  CPP_FLAGS="$(CPP_FLAGS)" EMSCRIPTEN_LDFLAGS="$(EMSCRIPTEN_LDFLAGS)"

all: cql

# Build standalone wasm for wasmtime
cql: orig/tree.o ${MYOBJS} ${MYHEADERS}
	@echo "LD=$(LD)"
	@echo "WASM_OUT=$(WASM_OUT)"
	@echo "CPP_FLAGS=$(CPP_FLAGS)"
	@echo "EMSCRIPTEN_LDFLAGS=$(EMSCRIPTEN_LDFLAGS)"
	@echo "MYOBJS=$$(echo ${MYOBJS} | wc -w)  MYORIGOBJS=$$(echo ${MYORIGOBJS} | wc -w)"
	$(LD) $(CPP_FLAGS) ${MYOBJS} ${MYORIGOBJS} -o $(WASM_OUT) $(EMSCRIPTEN_LDFLAGS)

# ---- keep your other targets (unchanged) ----
htmlcql: .FORCE
	rm -f ex/*.html
	chmod u+w doc/examples || true
	cqlhtml.sh
	rm -rf doc/examples
	mkdir doc/examples
	cp ex/*.html ex/*.cql doc/examples
	cp -r doc/examples
	rm ex/*.html

backup: .FORCE
	rm -rf backup
	mkdir backup
	cp *.h *.cpp *.txt origmakefile makefile-flags Makefile grammar.txt *.cql backup
	cp *.sh  backup
	cp -r genindex.pl search.criteria backup
	cp -r doc backup
	cp -r afek-book backup
	cp -r docdoc backup
	cp -r path backup
	cp -r expath backup
	cp -r exalpha backup
	cp -r mates backup
	cp sample.pgn backup
	mkdir backup/ex backup/3squares backup/docbin backup/colorizer backup/linkcheck backup/tagcheck backup/diagram backup/fragments
	cp ex/*.cql backup/ex
	cp fragments/*.cql backup/fragments
	cp 3squares/* backup/3squares
	cp docbin/*.cpp docbin/*.sh backup/docbin
	cp colorizer/*.cpp colorizer/*.h colorizer/Makefile backup/colorizer
	cp diagram/*.cpp diagram/*.h diagram/Makefile backup/diagram
	cp linkcheck/*.cpp linkcheck/*.h linkcheck/Makefile backup/linkcheck
	cp tagcheck/*.cpp tagcheck/*.h tagcheck/Makefile tagcheck/*.html backup/tagcheck
	mkdir backup/regression
	cp regression/*.cql regression/*.pgn backup/regression
	cp -r 61r backup
	mkdir backup/orig
	cp orig/Makefile orig/*.h orig/*.cpp backup/orig

zips:
	zips.sh

cleanout:
	rm -f *-out.pgn

pcdir:
	rm -rf backup
	make backup
	rm -rf pc
	mv backup pc

windowsfiles:
	rm -rf wincql/
	mkdir wincql/
	cp compilecql.bat wincql/
	mkdir wincql/orig/
	mkdir wincql/ex/
	mkdir wincql/exalpha/
	for i in ${MYOBJS};do cp `basename $$i .o`.cpp wincql;done
	for i in ${MYHEADERS};do cp $$i wincql;done
	cp orig/*.h orig/*.cpp wincql/orig
	cp -r exalpha/*.cql wincql/exalpha
	rm -rf /Users/s/winshare/wincql/
	mv wincql /Users/s/winshare/

stringreplace:
	$(MAKE) -C docbin stringreplace

stringsreplace:
	$(MAKE) -C docbin stringsreplace

urlreplace:
	$(MAKE) -C docbin urlreplace

tagsreplace:
	$(MAKE) -C docbin tagsreplace

docclean:
	$(MAKE) -C docbin clean

docbin: .FORCE
	$(MAKE) -C docbin docbin

cqlsourcedist: .FORCE
	rm -rf cqlsourcedist
	rm -rf cqlsourcedist.zip
	mkdir cqlsourcedist
	mkdir cqlsourcedist/orig
	mkdir cqlsourcedist/exalpha/
	cp orig/*.h orig/*.cpp orig/Makefile cqlsourcedist/orig
	cp exalpha/*.cql cqlsourcedist/exalpha
	for i in ${MYOBJS};do cp `basename $$i .o`.cpp cqlsourcedist;done
	for i in ${MYHEADERS};do cp $$i cqlsourcedist;done
	cp Makefile makefile-flags origmakefile cqlsourcedist
	cp readme-sourcedist.txt cqlsourcedist/readme.txt
	zip -r cqlsourcedist.zip cqlsourcedist
