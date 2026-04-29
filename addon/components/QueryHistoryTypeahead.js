/* global React */
const h = React.createElement;

function matchesFilter(query, filterText) {
  const words = filterText.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const q = query.toLowerCase();
  let pos = 0;
  for (const word of words) {
    const idx = q.indexOf(word, pos);
    if (idx === -1) return false;
    pos = idx + word.length;
  }
  return true;
}

function highlightMatches(query, filterText) {
  const words = filterText.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return query;
  const q = query.toLowerCase();
  const segments = [];
  let pos = 0;
  for (const word of words) {
    const idx = q.indexOf(word, pos);
    if (idx === -1) break;
    if (idx > pos) segments.push(query.slice(pos, idx));
    segments.push(h("strong", {key: idx}, query.slice(idx, idx + word.length)));
    pos = idx + word.length;
  }
  if (pos < query.length) segments.push(query.slice(pos));
  return segments;
}

export class QueryHistoryTypeahead extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isOpen: false,
      filterText: "",
      highlightedIndex: -1,
    };
    this.inputRef = null;
    this.listRef = null;
    this.onOpen = this.onOpen.bind(this);
    this.onBlur = this.onBlur.bind(this);
    this.onInput = this.onInput.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
  }

  onOpen() {
    this.setState({isOpen: true, filterText: "", highlightedIndex: -1});
  }

  onBlur() {
    this.setState({isOpen: false, filterText: "", highlightedIndex: -1});
  }

  onInput(e) {
    this.setState({filterText: e.target.value, highlightedIndex: -1});
  }

  onKeyDown(e) {
    const {list} = this.props;
    const {filterText, highlightedIndex} = this.state;
    const filteredList = list.filter(q => matchesFilter(q.query, filterText));

    if (e.key === "Escape") {
      e.preventDefault();
      this.setState({isOpen: false, filterText: "", highlightedIndex: -1});
      return;
    }

    if (filteredList.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      this.setState({highlightedIndex: (highlightedIndex + 1) % filteredList.length});
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      this.setState({
        highlightedIndex: highlightedIndex <= 0
          ? filteredList.length - 1
          : highlightedIndex - 1,
      });
    } else if (e.key === "Enter") {
      e.preventDefault();
      const entry = highlightedIndex === -1 ? filteredList[0] : filteredList[highlightedIndex];
      this.select(entry);
    }
  }

  select(entry) {
    this.setState({isOpen: false, filterText: "", highlightedIndex: -1});
    this.props.onSelect(entry);
  }

  componentDidUpdate(prevProps, prevState) {
    // Auto-focus the input when the dropdown opens.
    // No null-guard needed: inputRef.current is always present when isOpen is true
    // because the <input> is only rendered when isOpen === true.
    if (!prevState.isOpen && this.state.isOpen) {
      this.inputRef.focus();
    }
    // Scroll the highlighted item into view when keyboard navigation changes it.
    if (this.state.isOpen
        && this.state.highlightedIndex !== -1
        && this.state.highlightedIndex !== prevState.highlightedIndex
        && this.listRef) {
      const item = this.listRef.children[this.state.highlightedIndex];
      if (item) item.scrollIntoView({block: "nearest"});
    }
  }

  renderClosed() {
    return h("div", {
      className: "query-history-typeahead",
      onClick: this.onOpen,
    }, "Query History");
  }

  renderOpen() {
    const {list} = this.props;
    const {filterText, highlightedIndex} = this.state;
    const filteredList = list.filter(q => matchesFilter(q.query, filterText));

    return [
      h("input", {
        key: "input",
        type: "text",
        value: filterText,
        onChange: this.onInput,
        onKeyDown: this.onKeyDown,
        onBlur: this.onBlur,
        ref: (el) => { this.inputRef = el; },
        placeholder: "",
      }),
      h("ul", {
        key: "list",
        className: "query-history-dropdown",
        ref: (el) => { this.listRef = el; },
        onMouseDown: e => e.preventDefault(),
      },
        filteredList.length === 0
          ? h("li", {className: "query-history-option--empty"}, "No matching results")
          : filteredList.map((q, i) =>
            h("li", {
              key: String(i),
              className: i === highlightedIndex ? "query-history-option--highlighted" : "",
              onMouseDown: e => e.preventDefault(),
              onClick: () => this.select(q),
              onMouseEnter: () => this.setState({highlightedIndex: i}),
            }, highlightMatches(q.query.substring(0, 300), filterText))
          )
      ),
    ];
  }

  render() {
    const {isOpen} = this.state;
    return h("div", {className: "query-history-typeahead-wrapper"},
      isOpen ? this.renderOpen() : this.renderClosed()
    );
  }
}
