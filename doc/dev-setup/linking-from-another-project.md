# Linking xtendize from another project

Typically during the development of this package, we will need to test
some changes without going through the publishing process. The way to achieve this
is to use the `yarn link` feature:

In your chrome extension project:

## 1: Clone the xtendize project into a temporary folder:

```bash
# Depending on your setup, clone using SSH:
git clone git@github.com:IcaliaLabs/xtendize.git tmp/xtendize

# Or clone using HTTPS:
git clone https://github.com/IcaliaLabs/xtendize.git tmp/xtendize
```

## 2: Link your cloned project into the node packages available to the system:

```bash
# Move into your cloned project:
pushd tmp/xtendize

# Then run:
yarn link
```

## 3: Link xtendize into your project

```bash
# Move back into your extension project:
popd

# Then run:
yarn link xtendize
```