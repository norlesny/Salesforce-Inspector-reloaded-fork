/* global React */
const h = React.createElement;

function matchesFilter(text, filterText) {
  const words = filterText.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const t = text.toLowerCase();
  let pos = 0;
  for (const word of words) {
    const idx = t.indexOf(word, pos);
    if (idx === -1) return false;
    pos = idx + word.length;
  }
  return true;
}

function highlightMatches(text, filterText) {
  const words = filterText.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return text;
  const t = text.toLowerCase();
  const segments = [];
  let pos = 0;
  for (const word of words) {
    const idx = t.indexOf(word, pos);
    if (idx === -1) break;
    if (idx > pos) segments.push(text.slice(pos, idx));
    segments.push(h("strong", {key: idx}, text.slice(idx, idx + word.length)));
    pos = idx + word.length;
  }
  if (pos < text.length) segments.push(text.slice(pos));
  return segments;
}

// Props: list, label, getItemText(item)->string, onSelect(item), title (optional)
export class TypeaheadDropdown extends React.Component {
  constructor(props) {
    super(props);
    this.state = {isOpen: false, filterText: "", highlightedIndex: -1};
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
    const {list, getItemText} = this.props;
    const {filterText, highlightedIndex} = this.state;
    const filteredList = list.filter(item => matchesFilter(getItemText(item), filterText));

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
        highlightedIndex: highlightedIndex <= 0 ? filteredList.length - 1 : highlightedIndex - 1,
      });
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = highlightedIndex === -1 ? filteredList[0] : filteredList[highlightedIndex];
      this.select(item);
    }
  }

  select(item) {
    this.setState({isOpen: false, filterText: "", highlightedIndex: -1});
    this.props.onSelect(item);
  }

  componentDidUpdate(prevProps, prevState) {
    if (!prevState.isOpen && this.state.isOpen) {
      this.inputRef.focus();
    }
    if (this.state.isOpen
        && this.state.highlightedIndex !== -1
        && this.state.highlightedIndex !== prevState.highlightedIndex
        && this.listRef) {
      const item = this.listRef.children[this.state.highlightedIndex];
      if (item) item.scrollIntoView({block: "nearest"});
    }
  }

  renderClosed() {
    const {label, title} = this.props;
    return h("div", {
      className: "typeahead-dropdown",
      onClick: this.onOpen,
      ...(title ? {title} : {}),
    }, label);
  }

  renderOpen() {
    const {list, getItemText} = this.props;
    const {filterText, highlightedIndex} = this.state;
    const filteredList = list.filter(item => matchesFilter(getItemText(item), filterText));

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
        className: "typeahead-dropdown-list",
        ref: (el) => { this.listRef = el; },
        onMouseDown: e => e.preventDefault(),
      },
        filteredList.length === 0
          ? h("li", {className: "typeahead-option--empty"}, "No matching results")
          : filteredList.map((item, i) =>
            h("li", {
              key: String(i),
              className: i === highlightedIndex ? "typeahead-option--highlighted" : "",
              onMouseDown: e => e.preventDefault(),
              onClick: () => this.select(item),
              onMouseEnter: () => this.setState({highlightedIndex: i}),
            }, highlightMatches(getItemText(item).substring(0, 300), filterText))
          )
      ),
    ];
  }

  render() {
    const {isOpen} = this.state;
    return h("div", {className: "typeahead-dropdown-wrapper"},
      isOpen ? this.renderOpen() : this.renderClosed()
    );
  }
}
